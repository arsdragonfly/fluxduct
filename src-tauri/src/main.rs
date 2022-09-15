// Copyright (c) 2022 The fluxduct Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// SPDX-License-Identifier: MIT

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[derive(Clone, serde::Serialize, ts_rs::TS)]
#[ts(export)]
struct MessagePayload {
    message: String,
}

#[derive(Clone, serde::Serialize, ts_rs::TS)]
#[ts(export)]
struct NodePayload {
    id: u32,
    nick: Option<String>,
    name: Option<String>,
    description: Option<String>,
}

#[derive(Clone, serde::Serialize, ts_rs::TS)]
#[ts(export)]
struct LinkPayload {
    id: u32,
    input_port_id: u32,
    output_port_id: u32,
}

#[derive(Clone, serde::Serialize, ts_rs::TS)]
#[ts(export)]
struct PortPayload {
    id: u32,
    node_id: u32,
    secondary_id: u32, // port.id in the ForeignDict, decides ordering within a node's input/output side
    format_dsp: Option<String>,
    audio_channel: Option<String>,
    name: Option<String>,
    direction: Option<String>,
}

fn node_payload(node: &GlobalObject<ForeignDict>) -> NodePayload {
    let node_props = node.props.as_ref().expect("Node has no properties");
    NodePayload {
        id: node.id,
        nick: node_props.get("node.nick").map(|x| x.to_string()),
        name: node_props.get("node.name").map(|x| x.to_string()),
        description: node_props.get("node.description").map(|x| x.to_string()),
    }
}

fn link_payload(link: &GlobalObject<ForeignDict>) -> LinkPayload {
    let link_props = link.props.as_ref().expect("Link has no properties");
    LinkPayload {
        id: link.id,
        input_port_id: link_props
            .get("link.input.port")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        output_port_id: link_props
            .get("link.input.port")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
    }
}

fn port_payload(port: &GlobalObject<ForeignDict>) -> PortPayload {
    let port_props = port.props.as_ref().expect("Port has no properties");
    PortPayload {
        id: port.id,
        node_id: port_props
            .get("node.id")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        secondary_id: port_props
            .get("port.id")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        format_dsp: port_props.get("format.dsp").map(|x| x.to_string()),
        audio_channel: port_props.get("audio.channel").map(|x| x.to_string()),
        name: port_props.get("port.name").map(|x| x.to_string()),
        direction: port_props.get("port.direction").map(|x| x.to_string()),
    }
}

trait Payload: serde::Serialize + Clone {
    fn type_name(&self) -> String; // will be part of event_name()
}

impl Payload for NodePayload {
    fn type_name(&self) -> String {
        "node".to_owned()
    }
}

impl Payload for LinkPayload {
    fn type_name(&self) -> String {
        "link".to_owned()
    }
}

impl Payload for PortPayload {
    fn type_name(&self) -> String {
        "port".to_owned()
    }
}

trait TauriEvent {
    // an event that can be emitted to Tauri frontend
    type Payload;
    fn event_name(&self) -> String;
    fn event_payload(&self) -> Self::Payload;
    fn emit_all(&self, app: &tauri::AppHandle) -> tauri::Result<()>
    where
        Self::Payload: serde::Serialize + Clone,
    {
        app.emit_all(&self.event_name(), self.event_payload())
    }
}

struct AddEvent<T> {
    payload: T,
}

impl<T: Payload> TauriEvent for AddEvent<T> {
    type Payload = T;
    fn event_name(&self) -> String {
        format!("add_{}", self.payload.type_name())
    }

    fn event_payload(&self) -> Self::Payload {
        self.payload.clone()
    }
}

use pipewire::{
    registry::GlobalObject,
    spa::{ForeignDict, ReadableDict},
    types::ObjectType,
    Context, MainLoop,
};
use std::sync::mpsc;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let _pw_thread =
                std::thread::spawn(move || pw_thread_main(handle));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn pw_thread_main(app: tauri::AppHandle) {
    let (frontend_ready_send, frontend_ready_recv) = mpsc::channel::<()>();
    app.once_global("frontend_ready", move |_event| {
        frontend_ready_send.send(()).unwrap();
    });

    let mainloop = MainLoop::new().expect("Failed to create mainloop");
    let context = Context::new(&mainloop).expect("Failed to create context");
    let core = context.connect(None).expect("Failed to connect to remote");
    let registry = core.get_registry().expect("Failed to get registry");
    let _listener = registry
        .add_listener_local()
        .global(move |global| {
            println!("New global : {:?}", global);
            // app.emit_all(
            //     "pipewire_global",
            //     MessagePayload {
            //         message: format!("{:?}", global).into(),
            //     },
            // )
            // .unwrap();
            match global.type_ {
                ObjectType::Node => {
                    handle_node(global, &app);
                }
                ObjectType::Port => {
                    handle_port(global, &app);
                }
                ObjectType::Link => {
                    handle_link(global, &app);
                }
                _ => {}
            }
        })
        .register();

    frontend_ready_recv
        .recv()
        .expect("failed to receive frontend_ready event");
    mainloop.run();
}

fn handle_node(node: &GlobalObject<ForeignDict>, app: &tauri::AppHandle) {
    let add_event = AddEvent {
        payload: node_payload(node),
    };
    add_event.emit_all(app).unwrap()
}

fn handle_link(link: &GlobalObject<ForeignDict>, app: &tauri::AppHandle) {
    let add_event = AddEvent {
        payload: link_payload(link),
    };
    add_event.emit_all(app).unwrap()
}

fn handle_port(port: &GlobalObject<ForeignDict>, app: &tauri::AppHandle) {
    let add_event = AddEvent {
        payload: port_payload(port),
    };
    add_event.emit_all(app).unwrap()
}
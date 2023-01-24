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
    serial: u32,
    nick: Option<String>,
    name: Option<String>,
    description: Option<String>,
}

#[derive(Clone, serde::Serialize, ts_rs::TS)]
#[ts(export)]
struct LinkPayload {
    id: u32,
    serial: u32,
    input_port_id: u32,
    output_port_id: u32,
    input_node_id: u32,
    output_node_id: u32,
}

#[derive(Clone, serde::Serialize, ts_rs::TS)]
#[ts(export)]
struct PortPayload {
    id: u32,
    serial: u32,
    node_id: u32,
    secondary_id: u32, // port.id in the ForeignDict, decides ordering within a node's input/output side
    format_dsp: Option<String>,
    audio_channel: Option<String>,
    name: Option<String>,
    direction: Option<String>,
}

#[derive(Clone, serde::Serialize, ts_rs::TS)]
#[ts(export)]
struct IdPayload {
    id: u32,
}

fn node_payload(node: &GlobalObject<ForeignDict>) -> NodePayload {
    let node_props = node.props.as_ref().expect("Node has no properties");
    NodePayload {
        id: node.id,
        serial: node_props
            .get("object.serial")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        nick: node_props.get("node.nick").map(|x| x.to_string()),
        name: node_props.get("node.name").map(|x| x.to_string()),
        description: node_props.get("node.description").map(|x| x.to_string()),
    }
}

fn link_payload(link: &GlobalObject<ForeignDict>) -> LinkPayload {
    let link_props = link.props.as_ref().expect("Link has no properties");
    LinkPayload {
        id: link.id,
        serial: link_props
            .get("object.serial")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        input_port_id: link_props
            .get("link.input.port")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        output_port_id: link_props
            .get("link.output.port")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        input_node_id: link_props
            .get("link.input.node")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
        output_node_id: link_props
            .get("link.output.node")
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
        serial: port_props
            .get("object.serial")
            .map(|x| x.parse::<u32>())
            .transpose()
            .unwrap()
            .unwrap(),
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

impl Payload for IdPayload {
    fn type_name(&self) -> String {
        "id".to_owned()
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

struct DebugMessageEvent {
    payload: MessagePayload,
}

impl TauriEvent for DebugMessageEvent {
    type Payload = MessagePayload;
    fn event_name(&self) -> String {
        "debug_message".to_owned()
    }

    fn event_payload(&self) -> Self::Payload {
        self.payload.clone()
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

struct RemoveEvent<T> {
    payload: T,
}

impl<T: Payload> TauriEvent for RemoveEvent<T> {
    type Payload = T;
    fn event_name(&self) -> String {
        format!("remove_{}", self.payload.type_name())
    }

    fn event_payload(&self) -> Self::Payload {
        self.payload.clone()
    }
}

use pipewire::{
    registry::{GlobalObject, Listener, Registry},
    spa::{utils::Id, ForeignDict, ReadableDict},
    sys::pw_main_loop_get_loop,
    types::ObjectType,
    Context, Loop, MainLoop, MainLoopInner,
};
use std::{
    borrow::Borrow,
    cell::RefCell,
    ops::Deref,
    rc::Rc,
    sync::{mpsc, Arc},
};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let _pw_thread = std::thread::spawn(move || pw_thread_main(Arc::new(handle)));
            // let _pw_thread = std::thread::spawn(move || pw_thread_main_broken(Arc::new(handle)));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn pw_thread_main(app: Arc<tauri::AppHandle>) {
    let (frontend_ready_send, frontend_ready_recv) = mpsc::channel::<()>();

    app.listen_global("frontend_ready", move |_event| {
        frontend_ready_send.send(()).unwrap();
    });

    let listeners: Rc<RefCell<Vec<Arc<Listener>>>> = Rc::new(RefCell::new(Vec::new()));
    let mainloop = MainLoop::new().expect("Failed to create mainloop");
    let context = Context::new(&mainloop).expect("Failed to create context");
    let core = context.connect(None).expect("Failed to connect to remote");
    let registry = Rc::new(RefCell::new(
        core.get_registry().expect("Failed to get registry"),
    ));
    let listener = Arc::new(
        (*registry)
            .borrow()
            .add_listener_local()
            .global({
                let app = app.clone();
                move |global| {
                    println!("New global : {:?}", global);
                    send_object_debug_message(global, &app);
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
                }
            })
            .global_remove({
                let app = app.clone();
                move |id| {
                    println!("Global removed : {}", id);
                    send_string_debug_message(format!("Global removed : {}", id), &app);
                    handle_remove(id, &app);
                }
            })
            .register(),
    );
    listeners.borrow_mut().push(listener);
    if let Ok(_) = frontend_ready_recv.recv() {
        mainloop.run();
    }
}

// TODO: find out why it is broken
fn pw_thread_main_broken(app: Arc<tauri::AppHandle>) {
    let (frontend_ready_send, frontend_ready_recv) = pipewire::channel::channel::<()>();
    app.listen_global("frontend_ready", move |_event| {
        frontend_ready_send.send(()).unwrap();
    });

    let listeners: Rc<RefCell<Vec<Arc<Listener>>>> = Rc::new(RefCell::new(Vec::new()));
    let mainloop = MainLoop::new().expect("Failed to create mainloop");
    let context = Context::new(&mainloop).expect("Failed to create context");
    let core = context.connect(None).expect("Failed to connect to remote");
    let registry = Rc::new(RefCell::new(
        core.get_registry().expect("Failed to get registry"),
    ));
    let callback = {
        let listeners = listeners.clone();
        let registry = registry.clone();
        let app = app.clone();
        move |_| {
            let app = app.clone();
            println!("Frontend 1 ready, adding listeners");
            println!("{}", (*listeners).borrow().len());
            let listener = Arc::new(
                (*registry)
                    .borrow()
                    .add_listener_local()
                    .global(move |global| {
                        println!("New global : {:?}", global);
                        send_object_debug_message(global, &app);
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
                    .register(),
            );
            listeners.borrow_mut().push(listener);
        }
    };
    let receiver_1 = frontend_ready_recv.attach(&mainloop, callback);
    mainloop.run();
    println!("{:p}", &receiver_1);
}

fn send_string_debug_message(message: String, app: &tauri::AppHandle) {
    let debug_message_event = DebugMessageEvent {
        payload: MessagePayload { message },
    };
    debug_message_event.emit_all(app).unwrap()
}

fn send_object_debug_message(global: &GlobalObject<ForeignDict>, app: &tauri::AppHandle) {
    let debug_message_event = DebugMessageEvent {
        payload: MessagePayload {
            message: format!("New global : {:?}", global),
        },
    };
    debug_message_event.emit_all(app).unwrap()
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

fn handle_remove(id: u32, app: &tauri::AppHandle) {
    let remove_event = RemoveEvent {
        payload: IdPayload { id },
    };
    remove_event.emit_all(app).unwrap()
}
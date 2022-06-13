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
struct Payload {
  message: String,
}

use std::sync::mpsc;
use pipewire::{MainLoop, Context, types::ObjectType, registry::GlobalObject, spa::ForeignDict};
use tauri::Manager;

fn main() {
  let (tauri_to_pw_sender, tauri_to_pw_receiver) = pipewire::channel::channel::<()>();
  tauri::Builder::default()
    .setup(|app| {
      let handle = app.handle();
      let pw_thread = std::thread::spawn(move || pw_thread_main(handle, tauri_to_pw_receiver));
      Ok(())
      })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn pw_thread_main(app: tauri::AppHandle, tauri_to_pw_receiver: pipewire::channel::Receiver<()>) {
  let (frontend_ready_send, frontend_ready_recv) = mpsc::channel::<()>();
  app.once_global("frontend_ready", move |_event| { frontend_ready_send.send(()).unwrap(); });
  frontend_ready_recv.recv().expect("failed to receive frontend_ready event");

  let mainloop = MainLoop::new().expect("Failed to create mainloop");
  let context = Context::new(&mainloop).expect("Failed to create context");
  let core = context.connect(None).expect("Failed to connect to remote");
  let registry = core.get_registry().expect("Failed to get registry");
  let _listener = registry
    .add_listener_local()
    .global(move |global| {
      println!("New global : {:?}", global);
      app.emit_all("pipewire_global", Payload { message: format!("{:?}", global).into() }).unwrap();
      match global.type_ {
        ObjectType::Node => {

        },
        ObjectType::Port => {

        },
        ObjectType::Link => {

        },
        _ => {

        }
      }
    })
    .register();

  mainloop.run();
}

fn handle_node(
  node: &GlobalObject<ForeignDict>
) {
}
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
use pipewire::{MainLoop, Context};
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
    })
    .register();

  mainloop.run();
}
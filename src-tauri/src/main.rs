#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use pipewire::{MainLoop, Context};

fn main() {
  let (pw_sender, pw_receiver) = pipewire::channel::channel::<()>();
  let pw_thread = std::thread::spawn(move || pw_thread_main(pw_receiver));
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
  pw_thread.join().expect("Pipewire thread panicked");
}

fn pw_thread_main(pw_receiver: pipewire::channel::Receiver<()>) {
  let mainloop = MainLoop::new().expect("Failed to create mainloop");
  let context = Context::new(&mainloop).expect("Failed to create context");
  let core = context.connect(None).expect("Failed to connect to remote");
  let registry = core.get_registry().expect("Failed to get registry");
  let _listener = registry
    .add_listener_local()
    .global(|global| println!("New global : {:?}", global))
    .register();
  mainloop.run();
}
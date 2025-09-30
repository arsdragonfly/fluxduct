// Use #[neon::export] to export Rust functions as JavaScript functions.
// See more at: https://docs.rs/neon/latest/neon/attr.export.html
use typeshare::typeshare;
use serde::{Serialize, Deserialize};

#[neon::export]
fn hello(name: String) -> String {
    format!("hello {name}")
}

#[derive(Clone, Deserialize, Serialize)]
#[typeshare]
struct IdPayload {
    id: u32
}

#[neon::export(json)]
fn hello_id(id: f64) -> IdPayload {
    IdPayload { id: id as u32 }
}

// Use #[neon::main] to add additional behavior at module loading time.
// See more at: https://docs.rs/neon/latest/neon/attr.main.html

// #[neon::main]
// fn main(_cx: ModuleContext) -> NeonResult<()> {
//     println!("module is loaded!");
//     Ok(())
// }

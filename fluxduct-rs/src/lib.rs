#[macro_use]
extern crate napi_derive;

use napi::threadsafe_function::{
    ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode,
};
use once_cell::sync::OnceCell;
use pipewire::{
    context::ContextBox,
    main_loop::MainLoopBox,
    registry::Listener,
    spa::utils::dict::DictRef,
    types::ObjectType,
};
use serde::Serialize;
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::Arc;
use std::thread;

static CALLBACK: OnceCell<Arc<ThreadsafeFunction<EventWrapper, ErrorStrategy::Fatal>>> = OnceCell::new();

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[napi(object)]
pub struct MessagePayload {
    pub message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[napi(object)]
pub struct NodePayload {
    pub id: u32,
    pub serial: u32,
    pub nick: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[napi(object)]
pub struct LinkPayload {
    pub id: u32,
    pub serial: u32,
    pub input_port_id: u32,
    pub output_port_id: u32,
    pub input_node_id: u32,
    pub output_node_id: u32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[napi(object)]
pub struct PortPayload {
    pub id: u32,
    pub serial: u32,
    pub node_id: u32,
    pub secondary_id: u32,
    pub format_dsp: Option<String>,
    pub audio_channel: Option<String>,
    pub name: Option<String>,
    pub direction: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[napi(object)]
pub struct IdPayload {
    pub id: u32,
}

// Event wrapper for the callback - contains event name and JSON payload
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[napi(object)]
pub struct EventWrapper {
    pub event_name: String,
    pub payload: String, // JSON-serialized payload
}

fn node_payload(node: &pipewire::registry::GlobalObject<&DictRef>) -> NodePayload {
    let node_props = node.props.as_ref().expect("Node has no properties");
    NodePayload {
        id: node.id,
        serial: node_props
            .get("object.serial")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        nick: node_props.get("node.nick").map(|x| x.to_string()),
        name: node_props.get("node.name").map(|x| x.to_string()),
        description: node_props.get("node.description").map(|x| x.to_string()),
    }
}

fn link_payload(link: &pipewire::registry::GlobalObject<&DictRef>) -> LinkPayload {
    let link_props = link.props.as_ref().expect("Link has no properties");
    LinkPayload {
        id: link.id,
        serial: link_props
            .get("object.serial")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        input_port_id: link_props
            .get("link.input.port")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        output_port_id: link_props
            .get("link.output.port")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        input_node_id: link_props
            .get("link.input.node")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        output_node_id: link_props
            .get("link.output.node")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
    }
}

fn port_payload(port: &pipewire::registry::GlobalObject<&DictRef>) -> PortPayload {
    let port_props = port.props.as_ref().expect("Port has no properties");
    PortPayload {
        id: port.id,
        serial: port_props
            .get("object.serial")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        node_id: port_props
            .get("node.id")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        secondary_id: port_props
            .get("port.id")
            .and_then(|x| x.parse::<u32>().ok())
            .unwrap_or(0),
        format_dsp: port_props.get("format.dsp").map(|x| x.to_string()),
        audio_channel: port_props.get("audio.channel").map(|x| x.to_string()),
        name: port_props.get("port.name").map(|x| x.to_string()),
        direction: port_props.get("port.direction").map(|x| x.to_string()),
    }
}

fn send_event<T: Serialize>(event_name: &str, payload: T) {
    if let Some(callback) = CALLBACK.get() {
        let wrapper = EventWrapper {
            event_name: event_name.to_string(),
            payload: serde_json::to_string(&payload).unwrap_or_default(),
        };
        callback.call(wrapper, ThreadsafeFunctionCallMode::NonBlocking);
    }
}

/// Initialize PipeWire listener with callback
#[napi(ts_args_type = "callback: (event: EventWrapper) => void")]
pub fn init(callback: ThreadsafeFunction<EventWrapper, ErrorStrategy::Fatal>) {
    let callback = Arc::new(callback);
    let _ = CALLBACK.set(callback);

    thread::spawn(move || {
        let listeners: Rc<RefCell<Vec<Arc<Listener>>>> = Rc::new(RefCell::new(Vec::new()));
        let mainloop = MainLoopBox::new(None).expect("Failed to create mainloop");
        let context = ContextBox::new(&mainloop.loop_(), None).expect("Failed to create context");
        let core = context.connect(None).expect("Failed to connect to remote");
        let registry = Rc::new(RefCell::new(
            core.get_registry().expect("Failed to get registry"),
        ));

        let listener = Arc::new(
            (*registry)
                .borrow()
                .add_listener_local()
                .global({
                    move |global| {
                        send_event("debug_message", MessagePayload {
                            message: format!("New global : {:?}", global),
                        });
                        match global.type_ {
                            ObjectType::Node => {
                                send_event("add_node", node_payload(global));
                            }
                            ObjectType::Port => {
                                send_event("add_port", port_payload(global));
                            }
                            ObjectType::Link => {
                                send_event("add_link", link_payload(global));
                            }
                            _ => {}
                        }
                    }
                })
                .global_remove({
                    move |id| {
                        send_event("debug_message", MessagePayload {
                            message: format!("Global removed : {}", id),
                        });
                        send_event("remove_id", IdPayload { id });
                    }
                })
                .register(),
        );
        listeners.borrow_mut().push(listener);

        mainloop.run();
    });
}

/// Hello world function
#[napi]
pub fn hello(name: String) -> String {
    format!("hello {}", name)
}

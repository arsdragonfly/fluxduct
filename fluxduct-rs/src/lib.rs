// Use #[neon::export] to export Rust functions as JavaScript functions.
// See more at: https://docs.rs/neon/latest/neon/attr.export.html
use typeshare::typeshare;
use serde::Serialize;
use neon::prelude::*;
use std::sync::Arc;
use std::thread;
use std::cell::RefCell;
use std::rc::Rc;
use once_cell::sync::OnceCell;
use tokio::runtime::Runtime;

static RUNTIME: OnceCell<Runtime> = OnceCell::new();
use pipewire::{
    context::ContextBox,
    main_loop::MainLoopBox,
    registry::{GlobalObject, Listener},
    spa::utils::dict::DictRef,
    types::ObjectType,
};

#[derive(Clone, Serialize)]
#[typeshare]
struct MessagePayload {
    message: String,
}

#[derive(Clone, Serialize)]
#[typeshare]
struct NodePayload {
    id: u32,
    serial: u32,
    nick: Option<String>,
    name: Option<String>,
    description: Option<String>,
}

#[derive(Clone, Serialize)]
#[typeshare]
struct LinkPayload {
    id: u32,
    serial: u32,
    input_port_id: u32,
    output_port_id: u32,
    input_node_id: u32,
    output_node_id: u32,
}

#[derive(Clone, Serialize)]
#[typeshare]
struct PortPayload {
    id: u32,
    serial: u32,
    node_id: u32,
    secondary_id: u32,
    format_dsp: Option<String>,
    audio_channel: Option<String>,
    name: Option<String>,
    direction: Option<String>,
}

#[derive(Clone, Serialize)]
#[typeshare]
struct IdPayload {
    id: u32,
}

fn node_payload(node: &GlobalObject<&DictRef>) -> NodePayload {
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

fn link_payload(link: &GlobalObject<&DictRef>) -> LinkPayload {
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

fn port_payload(port: &GlobalObject<&DictRef>) -> PortPayload {
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

struct EventSender {
    channel: neon::event::Channel,
    callback: Arc<neon::handle::Root<JsFunction>>,
}

impl EventSender {
    fn send_message(&self, event_name: String, payload: MessagePayload) {
        let callback = self.callback.clone();
        self.channel.send(move |mut cx| {
            let callback = callback.to_inner(&mut cx);
            let this = cx.undefined();
            let event_name_js = cx.string(event_name);
            
            let payload_obj = cx.empty_object();
            let msg = cx.string(payload.message);
            payload_obj.set(&mut cx, "message", msg)?;

            let args = vec![event_name_js.upcast::<JsValue>(), payload_obj.upcast::<JsValue>()];
            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    }

    fn send_node(&self, event_name: String, payload: NodePayload) {
        let callback = self.callback.clone();
        self.channel.send(move |mut cx| {
            let callback = callback.to_inner(&mut cx);
            let this = cx.undefined();
            let event_name_js = cx.string(event_name);
            
            let obj = cx.empty_object();
            let id = cx.number(payload.id as f64);
            obj.set(&mut cx, "id", id)?;
            let serial = cx.number(payload.serial as f64);
            obj.set(&mut cx, "serial", serial)?;
            
            if let Some(nick) = payload.nick {
                let val = cx.string(nick);
                obj.set(&mut cx, "nick", val)?;
            }
            if let Some(name) = payload.name {
                let val = cx.string(name);
                obj.set(&mut cx, "name", val)?;
            }
            if let Some(desc) = payload.description {
                let val = cx.string(desc);
                obj.set(&mut cx, "description", val)?;
            }

            let args = vec![event_name_js.upcast::<JsValue>(), obj.upcast::<JsValue>()];
            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    }

    fn send_link(&self, event_name: String, payload: LinkPayload) {
        let callback = self.callback.clone();
        self.channel.send(move |mut cx| {
            let callback = callback.to_inner(&mut cx);
            let this = cx.undefined();
            let event_name_js = cx.string(event_name);
            
            let obj = cx.empty_object();
            let id = cx.number(payload.id as f64);
            obj.set(&mut cx, "id", id)?;
            let serial = cx.number(payload.serial as f64);
            obj.set(&mut cx, "serial", serial)?;
            let input_port_id = cx.number(payload.input_port_id as f64);
            obj.set(&mut cx, "input_port_id", input_port_id)?;
            let output_port_id = cx.number(payload.output_port_id as f64);
            obj.set(&mut cx, "output_port_id", output_port_id)?;
            let input_node_id = cx.number(payload.input_node_id as f64);
            obj.set(&mut cx, "input_node_id", input_node_id)?;
            let output_node_id = cx.number(payload.output_node_id as f64);
            obj.set(&mut cx, "output_node_id", output_node_id)?;

            let args = vec![event_name_js.upcast::<JsValue>(), obj.upcast::<JsValue>()];
            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    }

    fn send_port(&self, event_name: String, payload: PortPayload) {
        let callback = self.callback.clone();
        self.channel.send(move |mut cx| {
            let callback = callback.to_inner(&mut cx);
            let this = cx.undefined();
            let event_name_js = cx.string(event_name);
            
            let obj = cx.empty_object();
            let id = cx.number(payload.id as f64);
            obj.set(&mut cx, "id", id)?;
            let serial = cx.number(payload.serial as f64);
            obj.set(&mut cx, "serial", serial)?;
            let node_id = cx.number(payload.node_id as f64);
            obj.set(&mut cx, "node_id", node_id)?;
            let secondary_id = cx.number(payload.secondary_id as f64);
            obj.set(&mut cx, "secondary_id", secondary_id)?;

            if let Some(val) = payload.format_dsp {
                let v = cx.string(val);
                obj.set(&mut cx, "format_dsp", v)?;
            }
            if let Some(val) = payload.audio_channel {
                let v = cx.string(val);
                obj.set(&mut cx, "audio_channel", v)?;
            }
            if let Some(val) = payload.name {
                let v = cx.string(val);
                obj.set(&mut cx, "name", v)?;
            }
            if let Some(val) = payload.direction {
                let v = cx.string(val);
                obj.set(&mut cx, "direction", v)?;
            }

            let args = vec![event_name_js.upcast::<JsValue>(), obj.upcast::<JsValue>()];
            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    }

    fn send_id(&self, event_name: String, payload: IdPayload) {
        let callback = self.callback.clone();
        self.channel.send(move |mut cx| {
            let callback = callback.to_inner(&mut cx);
            let this = cx.undefined();
            let event_name_js = cx.string(event_name);
            
            let obj = cx.empty_object();
            let id = cx.number(payload.id as f64);
            obj.set(&mut cx, "id", id)?;

            let args = vec![event_name_js.upcast::<JsValue>(), obj.upcast::<JsValue>()];
            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    }
}

fn init(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = cx.argument::<JsFunction>(0)?.root(&mut cx);
    let channel = cx.channel();
    let sender = Arc::new(EventSender {
        channel,
        callback: Arc::new(callback),
    });

    thread::spawn(move || {
        let listeners: Rc<RefCell<Vec<Arc<Listener>>>> = Rc::new(RefCell::new(Vec::new()));
        let mainloop = MainLoopBox::new(None).expect("Failed to create mainloop");
        let context = ContextBox::new(&mainloop.loop_(), None).expect("Failed to create context");
        let core = context.connect(None).expect("Failed to connect to remote");
        let registry = Rc::new(RefCell::new(
            core.get_registry().expect("Failed to get registry"),
        ));

        let sender_clone = sender.clone();
        let listener = Arc::new(
            (*registry)
                .borrow()
                .add_listener_local()
                .global({
                    let sender = sender_clone.clone();
                    move |global| {
                        // println!("New global : {:?}", global);
                        sender.send_message("debug_message".to_string(), MessagePayload {
                            message: format!("New global : {:?}", global),
                        });
                        match global.type_ {
                            ObjectType::Node => {
                                sender.send_node("add_node".to_string(), node_payload(global));
                            }
                            ObjectType::Port => {
                                sender.send_port("add_port".to_string(), port_payload(global));
                            }
                            ObjectType::Link => {
                                sender.send_link("add_link".to_string(), link_payload(global));
                            }
                            _ => {}
                        }
                    }
                })
                .global_remove({
                    let sender = sender_clone.clone();
                    move |id| {
                        // println!("Global removed : {}", id);
                        sender.send_message("debug_message".to_string(), MessagePayload {
                            message: format!("Global removed : {}", id),
                        });
                        sender.send_id("remove_id".to_string(), IdPayload { id });
                    }
                })
                .register(),
        );
        listeners.borrow_mut().push(listener);
        
        mainloop.run();
    });

    Ok(cx.undefined())
}

fn hello(mut cx: FunctionContext) -> JsResult<JsString> {
    let name = cx.argument::<JsString>(0)?.value(&mut cx);
    Ok(cx.string(format!("hello {}", name)))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("init", init)?;
    cx.export_function("hello", hello)?;
    
    let runtime = RUNTIME.get_or_init(|| Runtime::new().unwrap());
    let _ = neon::set_global_executor(&mut cx, runtime);
    
    Ok(())
}

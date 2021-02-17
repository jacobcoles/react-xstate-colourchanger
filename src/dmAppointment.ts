import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

const grammar: { [index: string]: { person?: string, day?: string, time?: string, bool_val?: boolean, initial_function: string } } = {
    "John": { person: "John Appleseed" },
    "Sarah": { person: "Sarah Swiggity" },
    "daddy": { person: "The big lad" },
    "on monday": { day: "Friday" },
    "on tuesday": { day: "Thursday" },
    "on wednesday": { day: "Friday" },
    "on thursday": { day: "Thursday" },
    "on friday": { day: "Friday" },
    "on saturday": { day: "Thursday" },
    "on sunday": { day: "Friday" },
    "at 8": { time: "8:00" },
    "at 9": { time: "9:00" },
    "at 10": { time: "10:00" },
    "at 11": { time: "11:00" },
    "at 12": { time: "12:00" },
    "at 13": { time: "13:00" },
    "at 14": { time: "14:00" },
    "at 15": { time: "15:00" },
    "at 16": { time: "16:00" },
    "yes": { bool_val: true },
	"yeah": { bool_val: true },
	"ok": { bool_val: true },
	"sure": { bool_val: true },
	"ja": { bool_val: true },
    "no": { bool_val: false },
	"nope": { bool_val: false },
	"nein": { bool_val: false },
	"nej": { bool_val: false },
	"appointment": { initial_function: "appt" },
	"an appointment": { initial_function: "appt" },
	"set up an appointment": { initial_function: "appt" },
	"make an appointment": { initial_function: "appt" },
	"to do": { initial_function: "todo" },
	"set up a to do": { initial_function: "todo" },
	"make to do": { initial_function: "todo" },
	"make a to do": { initial_function: "todo" },
	"timer": { initial_function: "timer" },
	"make a timer": { initial_function: "timer" },
	"set a timer": { initial_function: "timer" },
	"set timer": { initial_function: "timer" },
}

const duckQuery = (query: string) => {
	return fetch(new Request(`https://api.duckduckgo.com/?q=${query}&format=json&skip_disambig=1`)).then(resp=> resp.json())
}

const proxyurl = "https://cors-anywhere.herokuapp.com/";
const rasaurl = 'https://rasajacobcoles.herokuapp.com/model/parse'
const nluRequest = (myQuery: string) =>
    fetch(new Request(proxyurl + rasaurl, {
        method: 'POST',
        headers: { 'Origin': 'http://localhost:3000/' }, // only required with proxy
        body: `{"text": "${myQuery}"}`
    }))
        .then(data => data.json());


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
		welcome:{
			initial: "prompt",
			on: {
				RECOGNISED: {
					target: "query",
					actions: assign((context) => { return { query: context.recResult } })
				}
			},
			states: {
                prompt: { 
					entry: say("Would you like to book an appointment, set a timer or add a to do item?"),
					on: { ENDSPEECH: "ask"} 
				},
				ask: {
					entry: listen()
				},
            }
		},
		query: {
			invoke: {
				id: "rasaquery",
				src: (context, event) => nluRequest(context.query),
				onDone: {
					target: "select_task",
                    actions: [
						assign((context, event) => { return {snippet: event.data.intent.name }}),
						(context:SDSContext, event:any) => console.log(event.data),
					]
                },
				onError: {
					target: 'init',
					actions: (context,event) => console.log(event.data)
				}
			}
		},
		select_task: {
			always: [
				{
					cond: (context) => context.snippet ===  "Appointment",
					target: "who"
				},
				{
					cond: (context) => context.snippet  ===  "TODO",
					target: "todo"
				},
				{
					cond: (context) => context.snippet  ===  "Timer",
					target: "timer"
				},
				{
					target: "init"
				}
			]
		},
		todo: {
			initial: "prompt",
			on: {
				ENDSPEECH: "init"
			},
			states: {
				prompt: {
					entry: say("You are in the to do thing."),
				},
			}
		},
		timer: {
			initial: "prompt",
			on: {
				ENDSPEECH: "init"
			},
			states: {
				prompt: {
					entry: say("You are in the timer thing.")
				},
			}
		},
        who: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "person" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { person: grammar[context.recResult].person }}),
                    target: "day"
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: say("Who are you meeting with?"),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I don't know them"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        day: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "day" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { day: grammar[context.recResult].day } }),
                    target: "whole_day_query"

                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.person}. On which day is your meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Can you please repeat that"),
                    on: { ENDSPEECH: "ask" }
                }
            }
        },
        whole_day_query: {
            initial: "prompt",
            on: {
                RECOGNISED: [
				{
					cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == false),
                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
                    target: "meeting_time_query"
				},
				{
					cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == true),
                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
                    target: "confirm_full_day"
				},
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Will the meeting take the whole day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Can you please repeat that"),
                    on: { ENDSPEECH: "ask" }
                },
            }
        },
        meeting_time_query: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "time" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { time: grammar[context.recResult].time } }),
                    target: "confirm_day_and_time"

                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `What time is the meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Can you please repeat that"),
                    on: { ENDSPEECH: "ask" }
                },
            }
        },
		confirm_day_and_time: {
            initial: "prompt",
            on: {
                RECOGNISED: [
				{
					cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == false),
                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
                    target: "init"
				},
				{
					cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == true),
                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
                    target: "finalise"
				},
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want to create an appointment with ${context.person} on ${context.day} at ${context.time}?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Can you please repeat that"),
                    on: { ENDSPEECH: "ask" }
                },
            }
        },
		confirm_full_day: {
            initial: "prompt",
            on: {
                RECOGNISED: [
				{
					cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == false),
                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
                    target: "init"
				},
				{
					cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == true),
                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
                    target: "finalise"
				},
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want to create an appointment with ${context.person} on ${context.day} for the whole day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Can you please repeat that"),
                    on: { ENDSPEECH: "ask" }
                },
            }
        },
		finalise: {
			entry: say("Your appointment has been created."),
			on: { ENDSPEECH: "init" }
		}

    }
})










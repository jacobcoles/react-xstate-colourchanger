import { MachineConfig, actions, Action, assign } from "xstate";
const { send, cancel } = actions;



function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

const grammar: { [index: string]: { person?: string, day?: string, time?: string, bool_val?: boolean, initial_function: string } } = {
    "john": { person: "John Appleseed" },
    "sarah": { person: "Sarah Swiggity" },
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
    "8": { time: "8:00" },
    "9": { time: "9:00" },
    "10": { time: "10:00" },
    "11": { time: "11:00" },
    "12": { time: "12:00" },
    "13": { time: "13:00" },
    "14": { time: "14:00" },
    "15": { time: "15:00" },
    "16": { time: "16:00" },
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

function promptAndAsk(prompt: string): MachineConfig<SDSContext, any, SDSEvent> {
	
    return ({
        initial: 'prompt',
        states: {
            prompt: {
                entry: say(prompt),
                on: { ENDSPEECH: 'ask' }
            },
            ask: {
                entry: [
					send('LISTEN'),
					send( 'MAXSPEECH', { delay: 4000, id: 'maxspeech_cancel' } )
				]
            },
        }
    })
}

const proxyurl = "https://cors-anywhere.herokuapp.com/" // can try instead "https://boiling-depths-26621.herokuapp.com/"
const rasaurl = 'https://rasajacobcoles.herokuapp.com/model/parse'
function nluRequest(): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
		initial: 'http_timeout',
		invoke: {
			id: "rasaquery",
			src: (context, event) => {
				
				return fetch(new Request(proxyurl + rasaurl, {
		        method: 'POST',
		        headers: { 'Origin': 'http://localhost:3000/' }, // only required with proxy
		        body: `{"text": "${context.query}"}`
				}))
		        .then(data => data.json());

			},
			onDone: [
				{
					target: '.invalid_query',
					cond: (context, event)=> { return ((event.data.intent.confidence) < 0.7) }
				},
				{
					target: '.valid_query',
                    actions: [
						assign((context, event) => { return {snippet: event.data.intent.name }}),
						(context:SDSContext, event:any) => console.log(event.data),
					]
				},
			],
			onError: {
					target: '#root.dm',
					actions: say("Sorry, there was an error. ")
				},
		},
		states: {
			http_timeout: {
				invoke: {
					src: (context, event) => {
						return new Promise((resolve) => {
								setTimeout(() => { resolve() }, 3000) 
							})
					},
				},
				onDone: send('HTTP_TIMEOUT')
			},
			invalid_query: {
				entry: send('INVALID_QUERY'),
			},
			valid_query: {
				entry: send('VALID_QUERY'),
			},
		},
	})
}

const commands = ['stop', 'help']

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'main',
    id: 'init',
    on: {
		MAXSPEECH: '.maxspeech',
		RECOGNISED: 
			[
				{
					target: ".stop",
					cond: (context) => context.recResult === 'stop' ,
				},
				{
					target: ".help",
					cond: (context) => context.recResult === 'help' ,
				}
			],
	},
    states: {
        main: {
			initial: 'clicky',
			states: {
				hist: { 
					type: 'history',
					history: 'shallow',
				 },
				clicky: {
					on: {
						CLICK: 'begin'
					},
				},
				begin:{
					initial: "prompt",
					id: "welcome",
					on: {
						RECOGNISED: {
							target: "query",
							actions: assign((context) => { return { query: context.recResult } }),
							cond: (context) => !commands.includes(context.recResult)
						}
					},
					states: {
						prompt: {
							...promptAndAsk("Would you like to book an appointment, set a timer or add a to do item?")
						}
		            }
				},
				query: {
					initial:'rasa_query',
					on: {
						RECOGNISED: {
							cond: (context)=> !commands.includes(context.recResult),
							target: '.rasa_query',
							actions: assign((context) => { return { query: context.recResult } })
						},
						INVALID_QUERY: {
							target: '.invalid_query'
						},
						VALID_QUERY: {
							target: 'select_task'
						},
						HTTP_TIMEOUT: {
							target: '.http_timeout'
						},
					},
					states: {
						rasa_query: {
							...nluRequest()
						},
						invalid_query: {
							...promptAndAsk("Sorry, I don't understand, please say that again"),
						},
						http_timeout: {
							...promptAndAsk("Sorry, the rasa server isnt responding right now. Try again."),
						},
					},
				},
				select_task: {
					initial: "select",
					states: {
						select: {
							always: [
								{
									cond: (context) => context.snippet ===  "Appointment",
									target: "#who"
								},
								{
									cond: (context) => context.snippet  ===  "TODO",
									target: "#todo"
								},
								{
									cond: (context) => context.snippet  ===  "Timer",
									target: "#timer"
								},
								{
									cond: (context) => !commands.includes(context.recResult),
									target: "prompt"
								}
							],
						},
						prompt: { 
							entry: say("Sorry, that isn't a valid answer"),
							on: { ENDSPEECH: "#welcome"} 
						},
					},
				},
				todo: {
		            id: "todo",
					initial: "prompt",
					on: {
						ENDSPEECH: "#init"
					},
					states: {
						prompt: {
							entry: say("You are in the to do thing."),
						},
					}
				},
				timer: {
		            id: "timer",
					initial: "prompt",
					on: {
						ENDSPEECH: "#init"
					},
					states: {
						prompt: {
							entry: say("You are in the timer thing.")
						},
					}
				},
		        who: {
		            id: "who",
		            initial: "prompt",
		            on: {
		                RECOGNISED: [{
		                    cond: (context) => "person" in (grammar[context.recResult] || {}),
		                    actions: assign((context) => { return { person: grammar[context.recResult].person }}),
		                    target: "day"
		                },
		                { 
							target: ".nomatch" ,
							cond: (context) => !commands.includes(context.recResult)
						}]
		            },
		            states: {
		                prompt: {
		                    ...promptAndAsk("Who are you meeting with?")
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
		                { 
							target: ".nomatch",
							cond: (context) => !commands.includes(context.recResult)
						}]
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
			                entry: [
								send('LISTEN'),
								send( 'MAXSPEECH', { delay: 5000, id: 'maxspeech_cancel' } )
							]
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
		                { 
							target: ".nomatch" ,
							cond: (context) => !commands.includes(context.recResult)
							
						}]
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
			                entry: [
								send('LISTEN'),
								send( 'MAXSPEECH', { delay: 5000, id: 'maxspeech_cancel' } )
							]
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
		                { 
							target: ".nomatch" ,
							cond: (context) => !commands.includes(context.recResult)
						}]
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
			                entry: [
								send('LISTEN'),
								send( 'MAXSPEECH', { delay: 5000, id: 'maxspeech_cancel' } )
							]
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
		                    target: "#init"
						},
						{
							cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == true),
		                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
		                    target: "finalise"
						},
		                { 
							target: ".nomatch" ,
							cond: (context) => !commands.includes(context.recResult)
						}]
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
			                entry: [
								send('LISTEN'),
								send( 'MAXSPEECH', { delay: 5000, id: 'maxspeech_cancel' } )
							]
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
		                    target: "#init"
						},
						{
							cond: (context) => "bool_val" in (grammar[context.recResult] || {}) && (grammar[context.recResult].bool_val == true),
		                    actions: assign((context) => { return { bool_val: grammar[context.recResult].bool_val } }),
		                    target: "finalise"
						},
		                { 
							target: ".nomatch" ,
							cond: (context) => !commands.includes(context.recResult)
						}]
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
			                entry: [
								send('LISTEN'),
								send( 'MAXSPEECH', { delay: 5000, id: 'maxspeech_cancel' } )
							]
			            },
		                nomatch: {
		                    entry: say("Can you please repeat that"),
		                    on: { ENDSPEECH: "ask" }
		                },
		            }
		        },
				finalise: {
					entry: say("Your appointment has been created."),
					on: { ENDSPEECH: "#init.main" }
				},
				say_error: {
					target: 'main',
					actions: say("Sorry, there was an error. ")
				},
		    },
		},
		maxspeech: {
			entry: say("Sorry,"),
			on: {
				ENDSPEECH: [
					{
						cond: (context)=> context.maxspeech_count < 3,
						target: 'main.hist'
					},
					{
						actions: assign((context) => { return { maxspeech_count: 0 } }),
						target: '#init'
					}
				]
			}
		},
		stop: {
			entry: say("Ok, program stopped"),
			target: 'main'
		},
		help: {
			entry: say("I'm supposed to help you but I won't"),
			target: 'main'
		},
	},
		
})










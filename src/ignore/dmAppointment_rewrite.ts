import { MachineConfig, send, Action, assign } from "xstate";


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
	"help": { help: true },
}



const nluRequestOld = (myQuery: string) =>
    fetch(new Request(proxyurl + rasaurl, {
        method: 'POST',
        headers: { 'Origin': 'http://localhost:3000/' }, // only required with proxy
        body: `{"text": "${myQuery}"}`
    }))
        .then(data => data.json());


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
					send('MAXSPEECH', { delay: 10000 })
				]
            },
        }
    })
}

const proxyurl = "https://boiling-depths-26621.herokuapp.com/" //"https://cors-anywhere.herokuapp.com/";
const rasaurl = 'https://rasajacobcoles.herokuapp.com/model/parse'
function nluRequest(): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'request',
        states: {
            request: {
				invoke: {
					id: "rasaquery",
					src: (context, event) => {
						
						let timeoutPromise = new Promise((resolve) => {
							let int = setTimeout(() => { resolve() }, 4000) 
						})
					    timeoutPromise.then(()=>{
							return 'FAILED_HTTP'
						})
						
						return fetch(new Request(proxyurl + rasaurl, {
				        method: 'POST',
				        headers: { 'Origin': 'http://localhost:3000/' }, // only required with proxy
				        body: `{"text": "${context.query}"}`
						}))
				        .then(data => data.json());
					},
					onDone: [
						{
							target: '.http_timeout',
							cond: (context, event)=> { console.log('http_timeout'); return (event.data === 'FAILED_HTTP') }
						},
						{
							target: '.invalid_query',
							cond: (context, event)=> { console.log('invalid query'); return ((event.data.intent.confidence) < 0.7) }
						},
						{
							target: ".valid_query",
		                    actions: [
								assign((context, event) => { console.log('valid query'); return {snippet: event.data.intent.name }}),
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
					invalid_query: {
						entry: send('INVALID_QUERY'),
					},
					valid_query: {
						entry: send('VALID_QUERY'),
					},
					http_timeout: {
						entry: send('HTTP_TIMEOUT'),
					},
				},
			}
		}}
		)
	}



const commands = ['stop', 'help']

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    id: 'init',
    states: {
        init: {
            on: {
                CLICK: 'container'
            }
        },
        container: {
			initial: 'welcome',
			on: {
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
				MAXSPEECH: 'init',
			},
			states: {
				//~ welcome:{
					//~ initial: "prompt",
					//~ id: "welcome",
					//~ on: {
						//~ RECOGNISED: {
							//~ target: "query",
							//~ actions: assign((context) => { return { query: context.recResult } })
						//~ }
					//~ },
					//~ ...promptAndAsk("Would you like to book an appointment, set a timer or add a to do item?")
				//~ },
				welcome: {
					id: "welcome",
					on: {
						RECOGNISED: {
							...nluRequest()
						},
						INVALID_QUERY: {
							...promptAndAsk("Not sure I know that command, please try again"),
						},
						VALID_QUERY: {
							...promptAndAsk("Not sure I know that command, please try again"),
						},
						HTTP_TIMEOUT: {
							target: '#init',
							actions: {
								...promptAndAsk("Sorry, there was a HTTP timeout, try again"),
							}
						},
					},
					...promptAndAsk("Would you like to book an appointment, add a to do item or set a timer?")
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
									target: "prompt",
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
		                { target: ".nomatch" }
		                ]
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
		                    actions: assign((context) => { 
								console.log(context.recResult)
								return { day: grammar[context.recResult].day } }),
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
					initial: 'prompt',
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
		                { target: ".nomatch" }
		                ]
		            },
		            states: {
		                prompt: {
		                    entry: send((context) => ({
		                        type: "SPEAK",
		                        value: `Will this meeting take the whole day?`
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
		                    target: "#init"
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
		                    target: "#init"
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
					on: { ENDSPEECH: "#init" }
				},
				say_error: {
					target: '#init',
					actions: say("Sorry, there was an error. Try again. ")
				},
				stop: {
					entry: say("Ok, program stopped"),
					target: '#init'
				},
				help: {
					entry: say("I'm supposed to help you but I won't"),
					target: '#init'
				}
			},
		}
    }
})





				//~ query: {
					//~ invoke: {
						//~ id: "rasaquery",
						//~ src: (context, event) => nluRequest(context.query),
						//~ onDone: [
							//~ {
								//~ target: ".prompt",
								//~ cond: (context, event)=> { return ((event.data.intent.confidence) < 0.7) }
							//~ },
							//~ {
								//~ target: "select_task",
			                    //~ actions: [
									//~ assign((context, event) => { return {snippet: event.data.intent.name }}),
									//~ (context:SDSContext, event:any) => console.log(event.data),
								//~ ]
							//~ },
		                //~ ],
						//~ onError: {
							//~ target: '#init',
							//~ actions: say("Sorry, there was an error. ")
						//~ },
					//~ },
					//~ states: {
		                //~ prompt: { 
							//~ entry: say("Sorry, I didn't get that"),
							//~ on: { ENDSPEECH: "#init.container.welcome"} 
						//~ },
		            //~ }
				//~ },




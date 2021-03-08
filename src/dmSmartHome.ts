import { MachineConfig, send, Action, assign } from "xstate";

// SRGS parser and example (logs the results to console on page load)
import { loadGrammar } from './runparser'
import { parse } from './chartparser'
import { grammar } from './grammars/quotesGrammar' //'./grammars/pizzaGrammar'

const gram = loadGrammar(grammar)
const input = "please open the window"
const prs = parse(input.split(/\s+/), gram)
const result = prs.resultsForRule(gram.$root)[0]

console.log(result)

const sayColour: Action<SDSContext, SDSEvent> = send((context: SDSContext) => ({
    type: "SPEAK", value: `Repainting to ${context.recResult}`
}))

function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function parse_text(input_text: string): Action<SDSContext, SDSEvent> {
	const gram = loadGrammar(grammar)
	const prs = parse(input_text.toLowerCase().split(/\s+/), gram)
	const result = prs.resultsForRule(gram.$root)[0]
	return result
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
                entry: send('LISTEN'),
            },
        }
    })
}


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
	id: 'init',
    states: {
        init: {
            on: {
                CLICK: 'ask'
            }
        },
		ask: {
			id: 'ask',
			on: {	
				RECOGNISED: [
                    { 
						target: 'select_task',
						actions: assign((context) => {
							let queryResp = (typeof parse_text(context.recResult) === 'undefined')? {action: "", object: ""} : parse_text(context.recResult)
							return { queryResp }
						})
					},
	            ]
	        },
	        ...promptAndAsk("What can I do for you?")
		},
		select_task: {
			id: 'select_task',
			initial: 'select',
			states: {
				select: { 
					always: [
						{
							cond: (context) => (context.queryResp.object ===  "light"),
							target: "#init.light"
						},
						{
							cond: (context) => (context.queryResp.object ===  "heat"),
							target: "#init.heat"
						},
						{
							cond: (context) => (context.queryResp.object ===  "window"),
							target: "#init.window"
						},
						{
							cond: (context) => (context.queryResp.object ===  "door"),
							target: "#init.door"
						},
						{
							target: "#init.invalid_prompt"
						}
					],
				}
			}
		},
		light: {
			id: 'light',
			initial: 'select',
			states: {
				select: {
					always: [
						{
							cond: (context) => (context.queryResp.action ===  "on"),
							target: "turn_light_on"
						},
						{
							cond: (context) => (context.queryResp.action ===  "off"),
							target: "turn_light_off"
						},
						{
							target: "#init.invalid_prompt"
						}
					],
				},
				turn_light_on: {
					always: {
						target: "#init",
						actions: say("Turning the light on")
					},
				},
				turn_light_off: {
					always: {
						target: "#init",
						actions: say("Turning the light off"),
					}
				},
			},
			
		},
		heat: {
			id: 'heat',
			initial: 'select',
			states: {
				select: {
					always: [
						{
							cond: (context) => (context.queryResp.action ===  "on"),
							target: "turn_heat_on"
						},
						{
							cond: (context) => (context.queryResp.action ===  "off"),
							target: "turn_heat_off"
						},
						{
							target: "#init.invalid_prompt"
						}
					],
				},
				turn_heat_on: {
					always: {
						target: "#init",
						actions: say("Turning the heating on"),
					},
				},
				turn_heat_off: {
					always: {
						target: "#init",
						actions: say("Turning the heating off"),
					},
				},
			},
		},
		window: {
			id: 'window',
			initial: 'select',
			states: {
				select: {
					always:[
						{
							cond: (context) => (context.queryResp.action ===  "open"),
							target: "open_window"
						},
						{
							cond: (context) => (context.queryResp.action ===  "close"),
							target: "close_window"
						},
						{
							target: "#init.invalid_prompt"
						}
					],
				},
				open_window: {
					always: {
						target: "#init",
						actions: say("Opening the window"),
					},
				},
				close_window: {
					always: {
						target: "#init",
						actions: say("Closing the window"),
					}
				},
			},
		},
		door: {
			id: 'door',
			initial: 'select',
			states: {
				select: {
					always: [
						{
							cond: (context) => (context.queryResp.action ===  "open"),
							target: "open_door"
						},
						{
							cond: (context) => (context.queryResp.action ===  "close"),
							target: "close_door"
						},
						{
							target: "#init.invalid_prompt"
						}
					],
				},
				open_door: {
					always: {
						target: "#init",
						actions: say("Opening the door"),
					},
				},
				close_door: {
					always: {
						target: "#init",
						actions: say("Closing the door"),
					},
				},
			},
		},
		invalid_prompt: { 
			entry: say("Sorry, that isn't a valid answer"),
			on: { ENDSPEECH: "#init"} 
		},
	}

})

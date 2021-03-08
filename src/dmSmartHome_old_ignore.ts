import { MachineConfig, send, Action, assign } from "xstate";

// SRGS parser and example (logs the results to console on page load)
import { loadGrammar } from './runparser'
import { parse } from './chartparser'
import { grammar } from './grammars/quotesGrammar' //'./grammars/pizzaGrammar'

const gram = loadGrammar(grammar)
const input = "please turn on the lights"
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
                CLICK: 'begin'
            }
        },
        begin: {
			id: 'begin',
			initial: 'welcome',
			on: {
                CLICK: 'init'
            },
			states: {
		        welcome: {
					id: 'welcome',
		            on: {
		                RECOGNISED: [
		                    {	target: 'stop', cond: (context) => context.recResult === 'stop' },
		                    { 
								target: 'select_task',
								actions: assign((context) => {
									let queryResp = parse_text(context.recResult)
									return { queryResp }
								})
							},
		                ]
		            },
		            states: {
						validateResp: {
							entry: say('idk im tired'),
							always: '#init'
						},
						otherState: {
							entry: say("ji")
						}
					},
		            ...promptAndAsk("Ask me a query")
		        },
		        select_task: {
					initial: "select",
					states: {
						select: {
							always: [
									{
										cond: (context) => (context.queryResp.object ===  "light"),
										target: "#light"
									},
									{
										cond: (context) => (context.queryResp.object ===  "heat"),
										target: "#heat"
									},
									{
										cond: (context) => (context.queryResp.object ===  "window"),
										target: "#window"
									},
									{
										cond: (context) => (context.queryResp.object ===  "door"),
										target: "#door"
									},
									{
										target: "prompt"
									}
								],
							},
							prompt: { 
								entry: say("Sorry, that isn't a valid answer"),
								on: { ENDSPEECH: "#init.begin.welcome"} 
							},
						},
				},
		        stop: {
		            entry: say("Ok"),
		            always: '#init'
		        },
		        invalidQuery: {
					entry: say("Sorry mate, you wrong bitch"),
					always: '#init.begin.welcome'
				},
		        repaint: {
		            initial: 'prompt',
		            states: {
		                prompt: {
		                    entry: sayColour,
		                    on: { ENDSPEECH: 'repaint' }
		                },
		                repaint: {
		                    entry: 'changeColour',
		                    always: '#init.begin.welcome'
		                }
		            }
		        }
		    }
	    }
    }
})

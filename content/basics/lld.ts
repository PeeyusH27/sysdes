import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  "thinking-in-objects": {
    what: "Object design turns a written problem into classes. A class is a blueprint that bundles data with the rules that use it. Nouns in the prompt become classes, and verbs become methods.",
    why: "When one class does everything, a rule ends up in several places. In the library lesson the 14-day limit lived in two spots, so changing students to 7 days made the email and the fee disagree.",
    example: "A lending library. Book, member and loan are the nouns. Borrow and return are the verbs. The loan knows its due day, the member knows their limit, and the library only coordinates.",
    when: "Use it at the start of every design. For each rule, ask who owns it. Stop adding classes when one protects nothing: if you cannot say what it guards in a sentence, merge it.",
  },
  solid: {
    what: "SOLID is five questions to ask a design when a requirement changes. Examples: how many reasons does this class have to change, and can a new kind be added without editing old code? Each letter names a smell.",
    why: "Without these checks one small change ripples outward. Three teams edit one Order file, or every new customer kind adds a branch to the same function. Each principle keeps a change in one place.",
    example: "A power strip. You plug in a new device and never rewire the wall. Pricing works the same way: a student discount is one new rule added to a list, and the old code stays untouched.",
    when: "Add an interface when a second variant appears or a test needs a fake. An if with two branches is fine, and three is the cue. Do not give every class an interface.",
  },
  "strategy-decorator": {
    what: "Strategy puts the rule that keeps changing behind a one-method interface, so you can swap it. Decorator wraps one rule inside another with the same interface, to adjust its result, like a cap on a price.",
    why: "Each new pricing request adds another if to one function. A new discount can break the cap, and the order of rules is hidden. Separate wrapped rules keep each one small and the order visible.",
    example: "A parking garage charges 20 an hour, half price at night, never over 100, and the first 10 minutes free. Each rule is a small piece wrapped around the hourly rate and read from the inside out.",
    when: "Use Strategy for alternatives and Decorator for add-on adjustments. Two stable cases belong in a plain if. Extract the interface when a third arrives, or when you must swap or test a rule alone.",
  },
  "state-observer": {
    what: "A state machine lists every state an object can be in and which events move it between them. Observer lets an object announce its changes to anyone who signed up, without knowing who is listening.",
    why: "Separate flags allow impossible mixes: two booleans describe four doors, but only three exist, so a door can be open and locked. A state table rejects illegal moves. Observer stops the door growing a call per listener.",
    example: "A door is closed, open or locked. Locking an open door is rejected and nothing changes. A bell then tells the log and the alarm about each legal change, and the door never knows who listens.",
    when: "Write the state table first when behaviour depends on a phase, like a vending machine. Use Observer for a few listeners on one object. If only one thing ever reacts, just call it directly.",
  },
  "creation-and-commands": {
    what: "A factory builds the right object from a name. A builder assembles one with many optional parts. A singleton is one shared instance. A command turns an action into an object that can do and undo itself.",
    why: "A switch on the channel name in many places means one missed copy breaks push users in production. Undo by saving full copies is costly: 1,000 edits of a 10,000 character text store 10 million characters.",
    example: "A text editor. Each edit is a command kept on two stacks, so Ctrl+Z and redo work. Replace all changes forty places but is one grouped command, so a single undo reverses it.",
    when: "Use a factory when the class depends on data, and commands when you need undo or logs. Skip the builder if an options object will do. Pass one instance in rather than using a singleton.",
  },
  "lld-playbook": {
    what: "A repeatable routine for a low-level design interview: clarify, list use cases, pick entities, sketch the public interface, draw, code one core case, then stress the design for change and for two users at once.",
    why: "Interviewers score your process, not a pattern list. Coding from sentence one, or a fine diagram with no running code, loses points. A fixed order over about 45 minutes keeps you from stalling.",
    example: "A meeting-room booker. Ask about scope, name book, cancel and freeRooms, model Room and Booking, code the overlap check, then explain how two people booking one slot are handled with a lock per room.",
    when: "Use it for every round, and cut scope out loud if you fall behind. Add a pattern only when a requirement hurts. Raise the two-users-at-once race yourself before the interviewer asks.",
  },
};

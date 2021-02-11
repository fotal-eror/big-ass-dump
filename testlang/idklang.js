//@ts-check
'use strict';

//#region functions
/**
 * @param {string} str
 * @param {number} inx
 * @returns {[string, number]} word and index after the word
 */
function getWord(str, inx = 0) {
	const i = str.indexOf(' ', inx);
	return [str.substring(inx, i < 0 ? undefined : i), i];
}
/**
 * @param {*} str
 */
function parseInteger(str) {
	return Math.abs(+str) & (VALUE_MODULUS - 1);
}
//#endregion

const VALUE_MODULUS = 2 ** 16;

const
	// @ts-ignore
	debugInput = () => Promise.resolve(parseInteger(prompt())),
	debugOutput = (val) => Promise.resolve(alert(val));

/** @typedef {number} Value */

/** @typedef {() => Promise<Value>} InputFunction */
/** @typedef {(value: Value) => Promise<void>} OutputFunction */

class IdkLang {
	/**
	 * @param {string} text
	 * @param {InputFunction} input
	 * @param {OutputFunction} output
	 */
	constructor (text, input = debugInput, output = debugOutput, bufLen = VALUE_MODULUS) {
		this.buffer = new Uint8Array(bufLen);
		this.vars = /** @type {{ [name: string]: Value }} */ ({});
		this.text = text.split('\n').map(val => val.trim());
		this.inx = 0;
		this.input = input;
		this.output = output;
	}

	/**
	 * @param {string} text
	 */
	static justRun(text) {
		new this(text).run();
	}

	async run() {
		console.time('idklang')

		for (this.inx = 0; this.inx < this.text.length; this.inx++) {
			if (!this.text[this.inx] || this.text[this.inx][0] === '#') continue;

			this.inx = await this.execInstr(this.inx);
		}

		console.timeEnd('idklang');
	}

	async execInstr(line = this.inx) {
		const [wrd0, inx0] = this.getParam(line);
		switch (wrd0) {
			case 'INPUT': {
				const [trg, inx1] = this.getParam(line, inx0);
				this.vars[trg] = await this.input();
			} break;
			case 'OUTPUT': {
				const [val, inx1] = this.getValue(line, inx0);
				await this.output(val);
			} break;
			case 'SET': { // SET trg val => trg = val
				const [trg, inx1] = this.getParam(line, inx0);
				const [val, inx2] = this.getValue(line, inx1);
				this.vars[trg] = val;
			} break;
			case 'LOAD': { // LOAD var buffer => var = from buffer
				const [trg, inx1] = this.getParam(line, inx0);
				const [src, inx2] = this.getValue(line, inx1);
				this.vars[trg] = this.buffer[src];
			} break;
			case 'STORE': { // STORE buffer var => buffer = from var
				const [trg, inx1] = this.getValue(line, inx0);
				const [val, inx2] = this.getValue(line, inx1);
				this.buffer[trg] = val;
			} break;
			case 'ADD': { // ADD trg a b => trg = a + b
				const [trg, inx1] = this.getParam(line, inx0);
				const [a, inx2] = this.getValue(line, inx1);
				const [b, inx3] = this.getValue(line, inx2);
				this.vars[trg] = parseInteger(a + b);
			} break;
			case 'SUB': { // same but -
				const [trg, inx1] = this.getParam(line, inx0);
				const [a, inx2] = this.getValue(line, inx1);
				const [b, inx3] = this.getValue(line, inx2);
				this.vars[trg] = parseInteger(a - b);
			} break;
			case 'CMP': { // CMP trg a b => if a < b then trg = 0xff
				const [trg, inx1] = this.getParam(line, inx0);
				const [a, inx2] = this.getValue(line, inx1);
				const [b, inx3] = this.getValue(line, inx2);
				//@ts-ignore
				this.vars[trg] = (a < b) * (VALUE_MODULUS - 1);
			} break;
			case 'EQ': { // EQ trg a b => if a == b then trg = 0xff
				const [trg, inx1] = this.getParam(line, inx0);
				const [a, inx2] = this.getValue(line, inx1);
				const [b, inx3] = this.getValue(line, inx2);
				//@ts-ignore
				this.vars[trg] = (a === b) * (VALUE_MODULUS - 1);
			} break;
			case 'IF': {
				const [val, inx1] = this.getValue(line, inx0);
				if (val === 0)
					line = this.seek(['ENDIF', 'ELSE'], ['IF', 'IFNOT'], line);
			} break;
			case 'IFNOT': {
				const [val, inx1] = this.getValue(line, inx0);
				if (val !== 0)
					line = this.seek(['ENDIF', 'ELSE'], ['IF', 'IFNOT'], line);
			} break;
			case 'ELSE': {
				// skip to endif
				line = this.seek(['ENDIF'], ['IF', 'IFNOT'], line);
			} break;
			case 'ENDIF':
				// skip
				break;
			case 'WHILE': {
				const [val, inx1] = this.getValue(line, inx0);
				if (val === 0)
					line = this.seek(['ENDWHILE'], ['WHILE'], line);
			} break;
			case 'ENDWHILE': {
				// go back to while
				line = this.seek(['WHILE'], ['ENDWHILE'], line, true) - 1;
			} break;
			case 'FOR': {
				const [from, inx1] = this.getValue(line, inx0);
				const [to, inx2] = this.getValue(line, inx1);
				if (from >= to)
					line = this.seek(['ENDFOR'], ['FOR'], line);
			} break;
			case 'ENDFOR': { // must have a var as a param to increment
				const [trg, inx1] = this.getParam(line, inx0);
				++this.vars[trg];
				// go back to for
				line = this.seek(['FOR'], ['ENDFOR'], line, true) - 1;
			} break;
			default:
				throw new SyntaxError(`Unknown instruction ${wrd0} on line ${line + 1}`);
		}

		return line;
	}

	/**
	 * @param {string[]} words
	 * @param {string[]} nestWords
	 */
	seek(words, nestWords, fromLine = this.inx, backwards = false) {
		for (let i = fromLine + (backwards ? -1 : +1), s = 1; backwards ? i >= 0 : i < this.text.length; backwards ? --i : i++) {
			if (!this.text[i] || this.text[i][0] === '#') continue;

			const w = this.getParam(i)[0];
			if (nestWords.includes(w))
				++s;
			else if (words.includes(w))
				--s;
			if (s <= 0)
				return i;
		}
		throw new SyntaxError(`${words} expected from line ${fromLine + 1}, but reached end of the text`);
	}
	/**
	 * Gets param and resolves it
	 * @param {number} line
	 * @param {number} inx
	 * @returns {[number, number]}
	 */
	getValue(line, inx) {
		const ret = this.getParam(line, inx);
		// @ts-ignore
		ret[0] = this.resolveParam(ret[0], line);
		// @ts-ignore
		return ret;
	}
	/**
	 * @param {number} line
	 * @param {number=} inx
	 */
	getParam(line, inx) {
		const ret = getWord(this.text[line], inx === undefined ? 0 : inx + 1);
		// throws exeption if inx === -1 or if no word found
		if (inx === -1 || !ret[0])
			throw new SyntaxError(`A parameter expected on line ${line + 1}`);
		return ret;
	}
	/**
	 * Returns value of a var or immediate value
	 * @param {string} word
	 * @param {number=} line
	 */
	resolveParam(word, line) {
		// if starts with number
		if (Number.isFinite(+word[0])) {
			return parseInteger(word);
		} else {
			if (this.vars[word] !== undefined)
				return this.vars[word];
			else
				//@ts-ignore
				throw new ReferenceError(`Unknown var ${word} on line ${line + 1}`);
		}
	}
}

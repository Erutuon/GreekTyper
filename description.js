$(function () {


const convert = {
	// Greek letters
	A: 'Α',  B: 'Β',  C: 'Ξ',  D: 'Δ',  E: 'Ε',
	F: 'Φ',  G: 'Γ',  H: 'Η',  I: 'Ι',  J: 'Σ',
	K: 'Κ',  L: 'Λ',  M: 'Μ',  N: 'Ν',  O: 'Ο',
	P: 'Π',  Q: 'Θ',  R: 'Ρ',  S: 'Σ',  T: 'Τ',
	U: 'Υ',  V: 'ν',  W: 'Ω',  X: 'Χ',  Y: 'Ψ',
	Z: 'Ζ',
	
	a: 'α', b: 'β', c: 'ξ', d: 'δ', e: 'ε',
	f: 'φ', g: 'γ', h: 'η', i: 'ι', j: 'ς',
	k: 'κ', l: 'λ', m: 'μ', n: 'ν', o: 'ο',
	p: 'π', q: 'θ', r: 'ρ', s: 'σ', t: 'τ',
	u: 'υ', v: 'ϝ', w: 'ω', x: 'χ', y: 'ψ',
	z: 'ζ',
	'^': '\u0306',	'_': '\u0304',		//	^, _	→	breve, macron
	'(': '\u0314',	')': '\u0313',	'+': '\u0308',	//	(, ), +	→	rough breathing, smooth breathing, diaeresis
	'/': '\u0301',	'\\': '\u0300', 		//	/, \	→	acute, grave
		'=': '\u0342',	'~': '\u0342',	//	=, ~	→	Greek circumflex
	'|': '\u0345',			//	|	→	iota subscript
	
	':': '·', // middle dot (Greek semicolon or colon)
	'?': ';', // semicolon (Greek question mark)
	// Greek question mark (;, U+37E) and ano teleia (·, U+387) are normalized
	// to middle dot and semicolon (NFD and NFC), and because normalization is
	// done frequently in this script, it would be hard to keep the "correct"
	// codepoint in the textbox.
	"'": '’',	// right single quotation mark (curly apostrophe), U+2019
	'0': '\u25CC'	// dotted circle
};

$('.togrc').html(function (index, content) {
	if ( Array.from(this.classList).includes('composed') ) {
		return content
			.replace(
				/./g,
				function (char) {
					return convert[char] || char;
				})
			.normalize('NFC');
	}
	return content
		.replace(
			/./g,
			function (char) {
				return convert[char] || char;
			})
});


})
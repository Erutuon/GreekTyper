window.onload = function () { // faster than $()


/*
	To do:
		- support non-Firefox codes for punctuation keys
		- allow customization of shortcuts?
	
	Compress with jscompress.com?
*/

'use strict';

const textBox	= $('textarea');	// jQuery object
const textBoxNode	= textBox[0];	// Node object

const options	= $('#options');
options.shownText	= '⏷options';
options.hiddenText	= '⏵options';
const optionsButton	= $('#options-button');

const description	= $('#description');
description.shownText	= '⏷description';
description.hiddenText	= '⏵description';
const descriptionButton	= $('#description-button');

const composedCharsToggle	= $('#compose-toggle');
const backspaceToggle	= $('#backspace-toggle');
const reorderDiacriticsToggle	= $('#reorder-diacritics-toggle');
const validateDiacriticsToggle	= $('#validate-diacritics-toggle');
const replaceDiacriticsToggle	= $('#replace-diacritics-toggle');
const macronAndBreveToggle	= $('#macron-and-breve-toggle');

/*
	Some crucial key codes are different in Firefox, Chrome or Opera,
	and Edge or Internet Explorer (http://unixpapa.com/js/key.html):
			Firefox		Edge		Chrome
	;:		59			186			59
	=+		61			187			61
	-_		173			189			45
	/?		191			191			49
	\|		220			220			92
*/

// Mapping from event.which (key code) to character,
// if different from QWERTY layout.
const convert = {
	// Greek letters
	// lowercase
	 65: 'Α',  66: 'Β',  67: 'Ξ',  68: 'Δ',  69: 'Ε',
	 70: 'Φ',  71: 'Γ',  72: 'Η',  73: 'Ι',  74: 'Σ',
	 75: 'Κ',  76: 'Λ',  77: 'Μ',  78: 'Ν',  79: 'Ο',
	 80: 'Π',  81: 'Θ',  82: 'Ρ',  83: 'Σ',  84: 'Τ',
	 85: 'Υ',  86: 'ν',  87: 'Ω',  88: 'Χ',  89: 'Ψ',
	 90: 'Ζ',
	// uppercase
	 97: 'α',  98: 'β',  99: 'ξ', 100: 'δ', 101: 'ε',
	102: 'φ', 103: 'γ', 104: 'η', 105: 'ι', 106: 'σ',
	107: 'κ', 108: 'λ', 109: 'μ', 110: 'ν', 111: 'ο',
	112: 'π', 113: 'θ', 114: 'ρ', 115: 'σ', 116: 'τ',
	117: 'υ', 118: 'ϝ', 119: 'ω', 120: 'χ', 121: 'ψ',
	122: 'ζ',
	
	// diacritics
	 94: '\u0306',  95: '\u0304',		//		^, _	→	breve, macron
	 40: '\u0314',  41: '\u0313',	43: '\u0308',	//		(, )	→	rough breathing, smooth breathing, diaeresis
	 47: '\u0301',  92: '\u0300',	61: '\u0342',	//		/, \, =	→	acute, grave, Greek circumflex
	124: '\u0345',		//		|	→	iota subscript
	
	// punctuation
	58: '·', 59: '·', // middle dot (Greek semicolon or colon)
	63: ';', // semicolon
	// Greek question mark (;, U+37E) and ano teleia (·, U+387) are normalized
	// to middle dot and semicolon (NFD and NFC), and because normalization is
	// done frequently in this script, it would be hard to keep the "correct"
	// codepoint in the textbox.
	39: '’'  // right single quotation mark (curly apostrophe), U+2019
};


const showCombiningCharacters = function (str) {
	return str.replace(/[\u0300-\u0345]/g, '\u25CC$&');
};

const diacriticOrder = {
	'\u0304': 1,							// macron
	'\u0306': 2,							// breve
	'\u0314': 3, '\u0313': 3, '\u0308': 3,	// rough breathing, smooth breathing, diaeresis
	'\u0301': 4, '\u0300': 4, '\u0342': 4,	// acute, grave, Greek circumflex
	'\u0345': 5,							// iota subscript
};

const compareDiacritics = function (diacritic1, diacritic2) {
	return diacriticOrder[diacritic1] - diacriticOrder[diacritic2];
};

// If two or more diacritics have the same sort value (diacriticOrder), keep the last of them.
const filterDiacritics = function (diacriticsArray) {
	let i = 0, diacritic, pos, prevPos;
	while ( diacritic = diacriticsArray[i] ) {
		pos = diacriticOrder[diacritic];
		if ( pos === prevPos ) {
			diacriticsArray.splice(i - 1, 1);
		} else {
			++i;
		}
		prevPos = pos;
	}
	return diacriticsArray;
};

const reorderDiacritics = function (diacritics) {
	if ( validateDiacriticsToggle.prop('checked') ) {
		return filterDiacritics(diacritics.split('').sort(compareDiacritics)).join('');
	} else {
		return diacritics.split('').sort(compareDiacritics).join('');
	}
};

const setTextAndCursor = function (textBoxNode, beforeCursor, afterCursor, insideSelection) {
	beforeCursor = composeEnd(beforeCursor);
	if ( insideSelection ) {
		textBoxNode.value = beforeCursor + insideSelection + afterCursor;
		textBoxNode.setSelectionRange(beforeCursor.length, beforeCursor.length + insideSelection.length);
	} else {
		textBoxNode.value = beforeCursor + afterCursor;
		textBoxNode.setSelectionRange(beforeCursor.length, beforeCursor.length);
	}
};

/*
	If "composed characters" toggle is checked, find a non-diacritic code
	unit followed by one or more diacritics at the end of the string (where
	it has just been typed), and convert it to a composed character if possible,
	Normalization Form C (canonical composition).
		α + ◌̓		→	ἀ
	Also corrects the order of any sequences of two or more diacritics
	if that setting is enabled.
*/
const composeEnd = function (text) {
	return composedCharsToggle.prop('checked') ?
		reorderDiacriticsToggle.prop('checked') ?
			text.replace(
				/[^\u0300-\u0345][\u0300-\u0345]+$/,
				function (match) {
					return match
						.normalize('NFD')
						.replace(/[\u0300-\u0345]{2,}$/, reorderDiacritics)
						.normalize('NFC');
				}) :
			text.replace(
				/[^\u0300-\u0345][\u0300-\u0345]+$/,
				function (match) {
					return match
						.normalize('NFC');
				}) :
		text;
};

const multipleDiacritics = /[\u0300-\u0345]{2,}/g;
const reorderAllDiacritics = function () {
	if ( composedCharsToggle.prop('checked') ) {
		textBoxNode.value = textBoxNode.value
			.normalize('NFD')
			.replace(multipleDiacritics, reorderDiacritics)
			.normalize('NFC');
	} else {
		textBoxNode.value = textBoxNode.value
			.replace(multipleDiacritics, reorderDiacritics);
	}
};

const setButtonText = function (element, buttonNode) {
	return function (animate) {
		buttonNode.innerHTML = element.hidden ?
			(element.hide(animate ? 200 : undefined), element.hiddenText) :
			(element.show(animate ? 200 : undefined), element.shownText);
	};
};

const createToggle = function (element) {
	return function () {
		element.hidden = !element.hidden;
		element.setButtonText(true);
	};
};

options.setButtonText	= setButtonText(options,	optionsButton[0]);
description.setButtonText	= setButtonText(description,	descriptionButton[0]);
optionsButton.click(createToggle(options));
descriptionButton.click(createToggle(description));

const composeTextBox = function () {
	const normalization = composedCharsToggle.prop('checked') ? 'NFC' : 'NFD';
	let { value: content, selectionStart: start, selectionEnd: end } = textBoxNode;
	setTextAndCursor(
		textBoxNode,
		content.slice(0, start).normalize(normalization),
		content.slice(end).normalize(normalization),
		content.slice(start, end).normalize(normalization));
	textBox.focus();
	// console.log(showCombiningCharacters(textBoxNode.value));
};

// Replacing diacritics requires validating diacritics, which requires reordering diacritics.
const reorderDiacriticsToggleEvent = function () {
	if ( reorderDiacriticsToggle.prop('checked') ) {
		validateDiacriticsToggle.removeAttr('disabled');
	} else {
		validateDiacriticsToggle.attr('disabled', true);
	}
};

const validateToggleEvent = function () {
	if ( validateDiacriticsToggle.prop('checked') ) {
		reorderAllDiacritics();
		replaceDiacriticsToggle.removeAttr('disabled');
		macronAndBreveToggle.removeAttr('disabled');
	} else {
		replaceDiacriticsToggle.attr('disabled', true);
		macronAndBreveToggle.attr('disabled', true);
	}
};

const macronAndBreveToggleEvent = function () {
	if ( macronAndBreveToggle.prop('checked') ) {
		diacriticOrder['\u0306'] = 2;
	} else {
		// Put breve at same sort level as macron, so that one or the other
		// will be removed by the filterDiacritics function.
		diacriticOrder['\u0306'] = 1;
		let text = textBoxNode.value;
		const composed = composedCharsToggle.prop('checked');
		if ( composed ) {
			text = text.normalize('NFD');
		}
		text = text.replace(/\u0304\u0306/g, '\u0304'); // replace macron–breve combination with macron
		if ( composed ) {
			text = text.normalize('NFC');
		}
		textBoxNode.value = text
	}
};

// Edge sends an error if localStorage is accessed, at least when this
// script is saved locally.
const canUseLocalStorage = (function () {
	try {
		const storage = window.localStorage;
		storage.setItem('test', '1');
		storage.removeItem('test');
		return true
	} catch (error) {
		// console.log (error)
		return false;
	}
} ());

// Retrieve content of text box, as well as position of cursor.
const retrieveStorage = function () {
	if ( !canUseLocalStorage ) {
		return;
	}
	const storage = window.localStorage;
	const	content	= storage.getItem('textBox'),
		start	= storage.getItem('selectionStart'),
		end	= storage.getItem('selectionEnd'),
		scrollTop	= storage.getItem('scrollTop');
	if ( content ) {
		textBox.val(content);
	}
	if (scrollTop) {
		textBoxNode.scrollTop = scrollTop;
	}
	if ( start && end ) {
		textBox.focus();
		textBoxNode.setSelectionRange(Number(start), Number(end));
	}
	$('input[type=checkbox]').each(function (index, element) {
		element = $(element);
		// '1' -> true, '0' -> false
		element.prop('checked', storage.getItem(element.attr('id')) === '1');
	});
	options.hidden = storage.getItem('optionsHidden') === '1';
	options.setButtonText();
	description.hidden = storage.getItem('descriptionHidden') === '1';
	description.setButtonText();
};
$(window).on('beforeunload', function () {
	if ( !canUseLocalStorage ) {
		return;
	}
	const storage = window.localStorage;
	storage.setItem('textBox',	textBox.val());
	storage.setItem('selectionStart',	textBoxNode.selectionStart);
	storage.setItem('selectionEnd',	textBoxNode.selectionEnd);
	storage.setItem('scrollTop',	textBoxNode.scrollTop);
	$('input[type=checkbox]').each(function (index, element) {
		element = $(element);
		// true -> '1', false -> '0': setItem coerces to string
		storage.setItem(element.attr('id'), Number(element.prop('checked')));
	});
	storage.setItem('optionsHidden', Number(options.css('display') === 'none'));
	storage.setItem('descriptionHidden', Number(description.css('display') === 'none'));
})

// change event
composedCharsToggle.change(composeTextBox);
validateDiacriticsToggle.change(validateToggleEvent);
reorderDiacriticsToggle.change(reorderDiacriticsToggleEvent);
macronAndBreveToggle.change(macronAndBreveToggleEvent);
// document ready event
retrieveStorage();

const littleSigmas = [ 'ς', 'σ' ];

const handleSigma = function (sigma, following) {
	// punctuation, whitespace, or nothing ... any way to make this simpler?
	if ( littleSigmas.includes(sigma) ) {
		return following === '' || (/^[\s–—,.·:;'’")\]|}\u0300-\u0345]/).test(following) ?
			'ς' :
		// Greek characters or hyphen... there are a few spacing accents and punctuation characters in here
			(/^[-\u0370-\u03FF\u1F00-\u1FFF]/).test(following) ?
			'σ' :
			sigma;
	}
	
	return sigma;
};

const insertInTextbox = function (textBox, str) {
	const {
		selectionStart: start,
		  selectionEnd: end,
				 value: content
	} = textBox;
	
	const afterCursor = content.slice(end);
	
	// Handle final sigma.
	str = handleSigma(str, afterCursor.charAt(0));
	const beforeCursor = start === 0 ?
		'' :
		start === 1 ?
		handleSigma(content.charAt(start - 1), str) :
		content.slice(0, start - 1) + handleSigma(content.charAt(start - 1), str); // Technically this works when start === 1...
	
	setTextAndCursor(textBox, beforeCursor + str, afterCursor);
};

// Microsoft Edge doesn't emit the keypress event on backspace, Firefox does.
textBox.keydown(function handleBackspace (event) {
	// Backspace has several options.
	if ( event.which === 8 ) {
		const { selectionStart: start, selectionEnd: end } = this;
		// Go ahead with default action if characters are selected, or for ctrl + backspace.
		if ( start !== end || event.ctrlKey ) {
			return;
		}
		event.preventDefault();
		const content = this.value;
		let beforeCursor, afterCursor;
		// Shift-backspace to delete a whole sequence of diacritics.
		if ( event.shiftKey ) {
			beforeCursor = content.slice(0, start).normalize('NFD').replace(/(?:[\u0300-\u0345]+|.)$/, ''),
			afterCursor  = content.slice(end);
		
		// If backspaceToggle is checked, delete a single diacritic or character.
		} else if ( backspaceToggle.prop('checked') ) {
			if ( composedCharsToggle.prop('checked') ) {
				beforeCursor = start === 0 ?
					'' :
					content.slice(0, start - 1)
						+ content.charAt(start - 1).normalize('NFD').slice(0, -1); // decompose, remove last character
				afterCursor  = content.slice(end);
			} else { // Assuming there are no composed characters if composedCharsToggle is not checked.
				beforeCursor = start === 0 ? '' : content.slice(0, start - 1);
				afterCursor = content.slice(end);
			}
		
		// Otherwise, delete a single character with all of its diacritics (if any).
		} else {
			beforeCursor = start === 0 ?
				'' :
				content.slice(0, start).replace(/[^\u0300-\u0345][\u0300-\u0345]*$/, '');
			afterCursor  = content.slice(end);
		}
		beforeCursor = beforeCursor.slice(0, -1) + handleSigma(beforeCursor.slice(-1), afterCursor.charAt(0));
		setTextAndCursor(this, beforeCursor, afterCursor);
	}
	// console.log(`keycode: ${event.which}; shift: ${event.shiftKey}; alt: ${event.altKey}; ctrl: ${event.ctrlKey}`);
	// console.log(event);
});

// This handles the keys that can type text.
textBox.keypress(function typeGreek (event) {
	const keyCode = event.which;
	if ( !(keyCode === 8 || event.ctrlKey || event.altKey || event.metaKey) ) {
		if ( convert[keyCode] ) {
			event.preventDefault();
			insertInTextbox(this, convert[keyCode]);
		} else {
			// If one character long, event.key is the actual typed value?
			if ( event.key.length === 1 ) {
				const {
						selectionStart: start,
						  selectionEnd: end,
								 value: content
				} = this;
				setTextAndCursor(
					this,
					start === 0 ?
						'' :
						start === 1 ?
							handleSigma(content.charAt(start - 1), event.key) :
							content.slice(0, start - 1)
								+ handleSigma(content.charAt(start - 1), event.key),
					content.slice(end));
			}
		}
	}
	// console.log(`keycode: ${event.which}; shift: ${event.shiftKey}; alt: ${event.altKey}; ctrl: ${event.ctrlKey}`);
	// console.log(event);
});


};
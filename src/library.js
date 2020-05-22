'use strict';

function libraryElement(id) {
	if ( id && Node.ELEMENT_NODE === id.nodeType ) return id;
	else if ( 'body' === id || 'head' === id ) return document[id];
	else return document.getElementById(id);
}

function libraryAssignClass(element, c) {
	var result = 0;
	var action = ( arguments.length > 2 ) ? arguments[2] || 0 : 1
	
	if ( element.classList && 'function' === typeof element.classList.contains ) {
		if ( !(action > 0 || action < 0) ) {
			result = element.classList.toggle(c) ? 1 : -1
		} else if ( element.classList.contains(c) ) {
			result = !( action > 0 ) ? element.classList.remove(c) || -1 : 0
		} else {
			result = !( action < 0 ) ? element.classList.add(c) || 1 : 0
		}
	} else if ( element.className && 'function' === typeof element.className.search ) {
		var pattern = new RegExp('(^|\\s+)'+c+'(\\s+|$)');
		
		if ( element.className.search(pattern) < 0 ) {
			if ( !(action < 0) ) {
				element.className = element.className !== "" ? element.className + " " + c : c
				result = 1
			}
		} else {
			if ( !(action > 0) ) {
				element.className = element.className.replace(pattern, " ").trim()
				result = -1
			}
		}
	} else if ( !(action < 0) ) {
		element.className = c
		result = 1
	}
	
	return result;
}

function libraryIsFilteringElement(element) {
	if ( !libraryIsFilteringElement.isEnabled ) { return false }
	
	return getComputedStyle(element).getPropertyValue('display') === 'none'
}

function libraryAssignClassToElements(className, selector, ascend, rule) {
	var element, elements = document.querySelectorAll(selector)
	var value, climb, index = elements.length
	var count = index
	
	ascend = ascend || 0
	
	while ( index --> 0 ) {
		element = elements[index]
		value = rule(element)
		
		for ( climb = 0 ; climb < ascend ; ++climb ) {
			element = element.parentElement
		}
		
		if ( libraryAssignClass(element, className, value) > 0 || value > 0 ) {
			count -= 1
		} else if ( libraryIsFilteringElement(element) ) {
			count -= 1
		}
	}
	
	return count
}

function libraryInflateParameters(result, string, leading, separator) {
	if ( string.charAt(0) === leading ) { string = string.slice(1) }
	
	var part, parts = string.split(separator)
	var object = result || {}
	var equals, value, key
	
	for ( part of parts ) {
		equals = part.indexOf('=')
		value = (equals < 0) ? true : decodeURIComponent(part.slice(equals + 1))
		key = (equals < 0) ? part : part.slice(0, equals)
		
		object[key] = value
	}
	
	return object
}

function libraryAssignCheckedToSelector(selector, checked, ancestorDisplayed) {
	var selectorChecked = selector + ':checked'
	var selectorUnchecked = selector + ':not(:checked)'
	var element, elements, index
	var ancestor, ascend
	
	if ( checked ) {
		checked = checked > 0
		elements = document.querySelectorAll(checked ? selectorUnchecked : selectorChecked)
	} else {
		var elementsChecked = document.querySelectorAll(selectorChecked)
		var elementsUnchecked = document.querySelectorAll(selectorUnchecked)
		
		checked = elementsUnchecked.length > elementsChecked.length
		elements = checked ? elementsUnchecked : elementsChecked
	}
	
	index = elements.length
	
	while ( index --> 0 ) {
		element = elements[index]
		
		if ( ancestorDisplayed >= 0 ) {
			ancestor = element
			ascend = ancestorDisplayed
			
			while ( ancestor && ascend --> 0 ) {
				ancestor = ancestor.parentElement
			}
			
			if ( ancestor && libraryIsFilteringElement(ancestor) ) {
				continue
			}
		}
		
		if ( element.checked !== checked ) {
			element.checked = checked
			
			if ( typeof element.onchange === 'function' ) { element.onchange() }
		}
	}
}

////////////////////////////////////////////////////////////////////////////////

function libraryToggleUnfiltered(value) {
	libraryAssignCheckedToSelector('table#library-table tr:not(.filtered) > td.name > input.toggle', value, 2)
}

function libraryChooseUnfiltered(value) {
	libraryAssignCheckedToSelector('table#library-table tr:not(.filtered) > td.selected > input.selection', value, 2)
}

function libraryFilterByUnchosen() {
	var count = libraryAssignClassToElements('filtered', 'table#library-table tr.library > td.selected > input.selection', 2, function (e) { return e.checked ? -1 : 1 })
	
	libraryFilterWasChanged(count)
}

function libraryFilterByUnopened() {
	var count = libraryAssignClassToElements('filtered', 'table#library-table tr.library > td.name > input.toggle', 2, function (e) { return e.checked ? -1 : 1 })
	
	libraryFilterWasChanged(count)
}

function libraryFilterByText(pattern) {
	var className = 'filtered'
	var table = libraryElement('library-table')
	var text = table.libraryItemText
	var key, index, count
	var row, rows = table.rows
	var assign, filtered = 0
	
	if ( !pattern ) {
		pattern = false
	} else if ( pattern.search(/[[?*.|^${}\\]/) < 0 ) {
		pattern = pattern.toLowerCase()
	} else {
		try { pattern = new RegExp(pattern, 'ius') }
		catch (error) { return }
	}
	
	for ( index = 1, count = rows.length ; index < count ; ++index ) {
		row = rows[index]
		key = row.id.slice(5)
		
		if ( pattern === false ) {
			assign = pattern
		} else if ( typeof pattern === 'string' ) {
			assign = text[key].toLowerCase().indexOf(pattern) < 0
		} else {
			assign = text[key].search(pattern) < 0
		}
		
		libraryAssignClass(row, className, assign ? 1 : -1)
		
		if ( assign || libraryIsFilteringElement(row) ) {
			filtered += 1
		}
	}
	
	count -= filtered + 1
	libraryFilterWasChanged(count)
	
	if ( count > 0 && count < 4 ) {
		libraryToggleUnfiltered(1)
	}
}

function libraryFilterByKeyValuePatternsMatchNumber(element, patterns) {
	var text, value
	var term, lower, upper
	var epsilon = 1.0 / 16777216
	
	if ( typeof element === 'number' ) {
		value = element
	} else if ( typeof element === 'boolean' ) {
		value = +element
	} else {
		value = parseFloat(element)
	}
	
	if ( isNaN(value) ) {
		return patterns.length === 1 && patterns[0] === false
	}
	
	for ( term of patterns ) {
		if ( Array.isArray(term) ) {
			lower = parseFloat(term[0])
			upper = parseFloat(term[1])
		} else {
			if ( term === true && patterns.length === 1 ) { return !!value }
			
			lower = parseFloat(term)
			upper = lower + epsilon
			lower = lower - epsilon
		}
		
		if ( element === false && isNaN(lower) ) { continue }
		
		if ( upper < lower ) {
			if ( !(value < upper || lower < value) ) { continue }
		} else {
			if ( value < lower || upper < value ) { continue }
		}
		
		return true
	}
	
	return false
}

function libraryFilterByKeyValuePatternsMatchText(element, patterns) {
	var text, value
	var term, lower, upper
	var highUnicode = '\uD7FF'
	var array
	
	if ( typeof element === 'string' ) {
		array = [element]
	} else if ( Array.isArray(element) ) {
		array = element
	} else {
		array = ['' + element]
	}
	
	if ( patterns.length === 1 && patterns[0] === false ) {
		return array.length <= 1 && !array[0]
	}
	
	for ( text of array ) {
		value = text.trim().toLowerCase()
		if ( !value ) { continue }
		
		for ( term of patterns ) {
			if ( Array.isArray(term) ) {
				lower = term[0]
				upper = term[1] + highUnicode
			} else {
				if ( term === true && patterns.length === 1 ) { return true }
				
				lower = term
				upper = lower + highUnicode
			}
		
			if ( upper < lower ) {
				if ( !(value < upper || lower < value) ) { continue }
			} else {
				if ( value < lower || upper < value ) { continue }
			}
		
			return true
		}
	}
	
	return false
}

function libraryFilterByKeyValuePatternsMatch(entry, filter, patterns, element) {
	var key = entry.property || entry.key
	var value = filter && filter[key]
	var matches = false
	
	if ( entry.isBoolean && !value ) {
		value = false
	}
	
	if ( !key || typeof value === 'undefined' ) {
		matches = false
	} else if ( typeof entry.match === 'function' ) {
		matches = entry.match(filter, patterns)
	} else if ( entry.isBoolean || entry.isNumber || typeof value === 'number' || typeof value === 'boolean' ) {
		matches = libraryFilterByKeyValuePatternsMatchNumber(value, patterns)
	} else if ( Array.isArray(value) || typeof value === 'string' ) {
		matches = libraryFilterByKeyValuePatternsMatchText(value, patterns)
	}
	
	return matches
}

function libraryFilterByKeyValuePatternsParseTerm(term, transform) {
	var pattern, array, index, value, lower, upper
	var found, count
	
	pattern = term.toLowerCase().split(',')
	array = []
	
	for ( value of pattern ) {
		value = value.trim()
		if ( !value ) { continue }
		
		found = value.match(/(…|\.{3}|[-–—])/)
		index = found ? found.index : -1
		count = found ? found[0].length : 0
		
		if ( index < 0 ) {
			value = value.trim()
			
			if ( typeof transform === 'function' ) {
				value = transform(value, 0)
			} else if ( transform ) {
				if ( transform.hasOwnProperty(value) ) { value = transform[value] }
			} else if ( value === '!' ) {
				value = false
			}
			
			array.push(value)
		} else if ( index === 0 && count === value.length ) {
			array.push(true)
		} else {
			lower = value.slice(0, index).trim()
			upper = value.slice(index + count).trim()
			
			if ( typeof transform === 'function' ) {
				lower = transform(lower, -1)
				upper = transform(upper, 1)
			} else if ( transform ) {
				if ( transform.hasOwnProperty(lower) ) { lower = transform[lower] }
				if ( transform.hasOwnProperty(upper) ) { upper = transform[upper] }
			}
			
			array.push([lower, upper])
		}
	}
	
	return array
}

function libraryFilterByKeyValuePatternsRegister(array, itemExtents) {
	var registry = libraryFilterByKeyValuePatterns.registry
	if ( !registry ) {
		registry = new Object()
		
		libraryFilterByKeyValuePatterns.registry = registry
	}
	
	var entry, alias, options = []
	for ( entry of array ) {
		if ( entry.key ) {
			registry[entry.key] = entry
			
			if ( Array.isArray(entry.aliases) ) {
				for ( alias of entry.aliases ) {
					registry[alias] = entry
				}
			}
			
			if ( !entry.isHidden ) {
				options.push('?' + entry.key + (entry.example ? ' ' + entry.example : entry.isBoolean ? '' : '='))
			}
		}
	}
	
	if ( itemExtents ) {
		var select = libraryRenderFilterOptionsFromExtents(array, itemExtents)
		
		libraryRenderHTML('afterend', 'library-filter-count', select)
	}
}

function libraryFilterByKeyValuePatternsMerge(value, merge) {
	if ( !merge ) { return value }
	
	var result = []
	var separator = ' '
	var valueMatches = value.split(/\s*[?](\w+)[:=^]?\s*/g)
	var mergeMatches = merge.split(/\s*[?](\w+)[:=^]?\s*/g)
	var index, count, value
	var pattern, key, keys = []
	var merged = new Object()
	
	for ( index = 1, count = mergeMatches.length ; index < count ; index += 2 ) {
		key = mergeMatches[index]
		pattern = mergeMatches[index + 1]
		key = key.trim().toLowerCase()
		
		if ( keys.indexOf(key) < 0 ) {
			keys.push(key)
		}
		
		merged[key] = pattern
	}
	
	if ( valueMatches[0] ) {
		result.push('text' + separator + valueMatches[0])
	}
	
	for ( index = 1, count = valueMatches.length ; index < count ; index += 2 ) {
		key = valueMatches[index]
		pattern = valueMatches[index + 1]
		key = key.trim().toLowerCase()
		value = merged[key]
		
		if ( typeof value === 'string' ) {
			if ( value === '!' || value === '' ) {
				value
			} else {
				value = pattern + ',' + value
			}
			
			result.push(key + separator + value)
			keys.splice(keys.indexOf(key), 1)
			delete merged[key]
		} else {
			result.push(key + separator + pattern)
		}
	}
	
	for ( key of keys ) {
		result.push(key + separator + merged[key])
	}
	
	return '?' + result.join(' ?')
}

function libraryFilterByKeyValuePatterns(value) {
	var registry = libraryFilterByKeyValuePatterns.registry
	if ( !registry ) { return false }
	
	var className = 'filtered'
	var table = libraryElement('library-table')
	var text = table.libraryItemText
	var filters = table.libraryItemFilters
	if ( !filters ) { return false }
	
	var matches = value.split(/\s*[?](\w+)[:=^]?\s*/g)
	if ( matches.length < 2 || matches[0] !== '' ) { return false }
	
	var patterns = []
	var index, key, pattern, negate
	var count = matches.length
	var all = false
	
	var row, rows = table.rows
	var assign, mismatch, filtered = 0
	
	for ( index = 1 ; index < count ; index += 2 ) {
		key = matches[index]
		pattern = matches[index + 1]
		key = key.trim().toLowerCase()
		
		if ( key === 'or' ) {
			all = true
			continue
		}
		
		if ( key === 'shuffle' && typeof window['tableSort'] === 'function' ) {
			tableSort(table.rows[0].cells[0], 'shuffle')
			continue
		}
		
		negate = pattern.charAt(0) === '!'
		
		if ( negate ) {
			pattern = pattern.slice(1)
		}
		
		if ( key === 'text' && text ) {
			if ( !negate && pattern.search(/[[?*.|^${}\\]/) < 0 ) {
				pattern = pattern.toLowerCase()
			} else {
				try { pattern = new RegExp(pattern, 'ius') }
				catch (error) { continue }
				
				pattern.negate = negate
			}
			
			patterns.push(pattern)
		} else if ( registry[key] ) {
			if ( pattern === '' ) {
				pattern = '…'
			}
			
			patterns.push({
				'entry':registry[key],
				'negate':negate,
				'patterns':libraryFilterByKeyValuePatternsParseTerm(pattern, registry[key].transform)
			})
		} else {
			continue
		}
	}
	
	if ( !patterns.length ) {
		return false
	}
	
	for ( index = 1, count = rows.length ; index < count ; ++index ) {
		assign = all
		row = rows[index]
		key = row.id.slice(5)
		
		for ( pattern of patterns ) {
			if ( pattern.patterns ) {
				mismatch = !libraryFilterByKeyValuePatternsMatch(pattern.entry, filters[key], pattern.patterns, row)
			} else if ( typeof pattern === 'string' ) {
				mismatch = text[key].toLowerCase().indexOf(pattern) < 0
			} else {
				mismatch = text[key].search(pattern) < 0
			}
			
			if ( pattern.negate ) {
				mismatch = !mismatch
			}
			
			if ( !mismatch === all ) {
				assign = !all
				break
			}
		}
		
		libraryAssignClass(row, className, assign ? 1 : -1)
		
		if ( assign || libraryIsFilteringElement(row) ) {
			filtered += 1
		}
	}
	
	count -= filtered + 1
	libraryFilterWasChanged(count)
	
	if ( count > 0 && count < 4 ) {
		libraryToggleUnfiltered(1)
	}
	
	return patterns.length > 0
}

function libraryItemExtents(items, property, filters) {
	var result = new Object()
	var item, key, keys, value, entry
	var none = '!'
	var filter, minimum, lookup = new Object()
	var index, counts = new Object()
	
	if ( Array.isArray(filters) ) {
		for ( filter of filters ) {
			lookup[filter.property || filter.key] = filter
		}
	}
	
	for ( item of items ) {
		if ( property && item[property] ) {
			item = item[property]
		}
		
		keys = Object.keys(item)
		
		for ( key of keys ) {
			value = item[key]
			filter = lookup[key]
			minimum = filter && filter.minimum || 0
			
			if ( !result[key] ) {
				result[key] = []
			}
			
			if ( minimum > 1 ) {
				if ( !counts[key] ) {
					counts[key] = new Object()
				}
			}
			
			if ( typeof value === 'undefined' ) {
				if ( result[key][0] !== none ) {
					result[key].unshift(none)
				}
			} else if ( Array.isArray(value) ) {
				if ( value.length > 0 ) {
					for ( entry of value ) {
						if ( result[key].indexOf(entry) < 0 ) {
							result[key].push(entry)
						}
						if ( minimum > 1 ) {
							counts[key][entry] = 1 + (counts[key][entry] || 0)
						}
					}
				} else {
					if ( result[key][0] !== none ) {
						result[key].unshift(none)
					}
				}
			} else {
				if ( result[key].indexOf(value) < 0 ) {
					result[key].push(value)
				}
				if ( minimum > 1 ) {
					counts[key][entry] = 1 + (counts[key][entry] || 0)
				}
			}
		}
	}
	
	keys = Object.keys(counts)
	
	for ( key of keys ) {
		filter = lookup[key]
		minimum = filter.minimum
		index = result[key].length
		
		while ( index --> 0 ) {
			if ( result[key][index] !== none && counts[key][result[key][index]] < minimum ) {
				result[key].splice(index, 1)
			}
		}
	}
	
	return result
}

function libraryFilterByKeys(keys) {
	var form = libraryElement('library-form')
	var recognized = []
	var key
	
	for ( key of keys ) {
		key = key.trim()
		
		if ( form['select_' + key] ) {
			form['select_' + key].checked = true
			recognized.push(key)
		} else {
			console.log("unrecognized key " + key)
		}
	}
	
	if ( recognized.length > 0 ) {
		libraryFilterByUnchosen()
		
		if ( recognized.length < 30 ) {
			libraryToggleUnfiltered(1)
		}
	}
}

function libraryFilterBySearch(value) {
	if ( value === '#' ) {
		libraryFilterByUnchosen()
	} else if ( value === '/' ) {
		libraryFilterByUnopened()
	} else if ( !libraryFilterByKeyValuePatterns(value) ) {
		libraryFilterByText(value)
	}
}

function libraryFilterWasChanged(count) {
	var element = libraryElement('library-filter-count')
	
	if ( element ) {
		element.textContent = count || ''
	}
	
	libraryHandleSelect(false)
}

////////////////////////////////////////////////////////////////////////////////

function libraryHandleHashChanged(event) {
	var hash = location.hash
	
	if ( hash && hash.length > 1 ) {
		var keys = hash.slice(1).split(',')
		
		libraryFilterByKeys(keys)
		
		libraryElement('library-filter').value = '#'
	} else {
		libraryFilterByText('')
	}
}

function libraryHandleSelect(key) {
	var share = libraryElement('share-selection')
	var selector = 'table#library-table tr:not(.filtered) > td.selected > input.selection'
	var elementsChecked = document.querySelectorAll(selector + ':checked')
	var elementsUnchecked = document.querySelectorAll(selector + ':not(:checked)')
	
	if ( share ) {
		var keys = Array.prototype.map.call(elementsChecked, function (e) { return e.id.slice(7) })
		var hash = keys.sort().join(",")
		
		share.href = "#" + hash
	}
	
	var all = libraryElement('select-all')
	
	if ( all ) {
		all.indeterminate = elementsChecked.length > 0 && elementsUnchecked.length > 0
		all.checked = elementsChecked.length > elementsUnchecked.length
	}
}

function libraryHandleSearch(event) {
	var value = typeof event === 'string' ? event : event.target.value || ""
	
	libraryFilterBySearch(value)
}

function libraryHandleSubmit(event) {
	var value = event.target.f.value
	
	libraryFilterBySearch(value)
	
	event.preventDefault()
	
	return false
}

function libraryRandomInteger(count) {
	if ( crypto && crypto.getRandomValues ) {
		var randomValues = new Uint32Array(1)
		
		crypto.getRandomValues(randomValues)
		
		return randomValues[0] % count
	} else {
		return Math.floor(Math.random() * Math.floor(count)) | 0
	}
}

function libraryHandleDice(event, dice) {
	var className = 'rolled'
	var target = event && (event.currentTarget || event.target)
	var element = target && target.getElementsByClassName(className)[0]
	
	if ( !target || !element ) { return }
	
	var matches = dice.toLowerCase().replace(/\s+/g, '').split(/(\b[+-]?\d*d?\d+\b|[×*])/g)
	var index, count = matches && matches.length
	var value, found, sides, roll, rolls = 0, modifiers = 0
	var times = 0, sum = 0
	
	for ( index = 1 ; index < count ; index += 2 ) {
		value = matches[index]
		found = value.indexOf('d')
		
		if ( value === '*' || value === '×' ) {
			times = true
			continue
		}
		
		if ( found < 0 ) {
			value = parseInt(value)
			
			if ( value ) {
				if ( times ) {
					sum *= value
					times = false
				} else {
					sum += value
				}
				
				modifiers += 1
			}
		} else {
			sides = parseInt(value.slice(found + 1)) || 0
			value = found > 0 ? parseInt(value.slice(0, found)) : 1
			
			if ( sides > 1 ) {
				rolls += 1
				roll = 0
				
				while ( value --> 0 ) {
					roll += 1 + libraryRandomInteger(sides)
				}
				
				if ( times ) {
					sum *= roll
					times = false
				} else {
					sum += roll
				}
			}
		}
	}
	
	if ( target.parentElement.tagName === 'TH' ) {
		var cell = target.parentElement
		var row = cell.parentElement
		var table = row.parentElement
		count = table.childElementCount
		
		if ( rolls === 1 && modifiers === 0 && count === sides + 1 ) {
			for ( index = 1 ; index < count ; ++index ) {
				libraryAssignClass(table.children[index], className, index === sum ? 1 : -1)
			}
		} else if ( row.firstElementChild === cell ) {
			for ( index = 1 ; index < count ; ++index ) {
				value = table.children[index].firstElementChild.textContent
				value = value.split(/\D+/)
				value = value.length < 3 ? value.length < 2 ? +value[0] === sum : +value[0] <= sum && sum <= +value[1] : false
				
				libraryAssignClass(table.children[index], className, value ? 1 : -1)
			}
		}
	}
	
	var text = ""
	
	if ( rolls > 0 ) {
		text = " : " + sum
		
		if ( element.textContent == text ) {
			text += "↺"
		}
	}
	
	element.textContent = text
}

function libraryHandleChance(event, chance) {
	var className = 'rolled'
	var target = event && (event.currentTarget || event.target)
	var element = target && target.getElementsByClassName(className)[0]
	
	if ( !target || !element ) { return }
	
	chance = parseInt(chance)
	
	if ( !chance ) { return }
	
	var value = 1 + libraryRandomInteger(100)
	var success = value <= chance
	
	libraryAssignClass(element, className + '-success', success ? 1 : -1)
	libraryAssignClass(element, className + '-failure', success ? -1 : 1)
	
	element.textContent = " (" + value + ")"
}

function libraryHandleFilterOption(event) {
	var select = event.target
	var index = select ? select.selectedIndex : -1
	var option = index < 0 ? false : select.options[index]
	var filter = libraryElement('library-filter')
	
	if ( option && option.value ) {
		filter.value = libraryFilterByKeyValuePatternsMerge(filter.value, option.value)
		libraryFilterBySearch(filter.value)
	}
	
	select.selectedIndex = 0
	select.blur()
}

////////////////////////////////////////////////////////////////////////////////

function libraryStripDiacriticals(string) {
	if ( typeof string.normalize === 'function' ) {
		return string.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
	} else {
		return string.replace('é', 'e')
	}
}

function libraryKey(name) {
	return libraryStripDiacriticals(name.toLowerCase()).replace(/(['‘’(){}×.,:"“”]+|[-+ \t]+|\ba\s|\bof\s|\bthe\s)/g, '')
}

function libraryResolveReferences(text, object) {
	text = text.replace(/\{=([^{}]+)\}/g, function (match, list) {
		var part = list.split('/'), key = part[0], value = object[key]
		
		if ( value && part.length > 1 ) {
			switch ( part[1] ) {
			case 'l': value = value.toLocaleLowerCase(); break
			case 'u': value = value.toLocaleUpperCase(); break
			case 'a': value = "a"; break
			case 'at': value = "A"; break
			}
		}
		
		return "<span class='property " + key + "'>" + (value || '-') + "</span>"
	})
	
	text = text.replace(/\{@i ([^{}]+)\}/g, "<span class='entries italic'>$1</span> ")
	
	text = text.replace(/\{@([^{} ]+)\s+([^{}]+)\}/g, function (match, type, list) {
		var part = list.split('|')
		
		switch ( type ) {
		case "h": return "<span class='entries hit italic'>Hit: " + list + "</span> "
		case "recharge": return "<span class='entries recharge'>" + list + "</span>"
		case "b": case "bold": return "<span class='entries bold'>" + list + "</span>"
		case "i": case "italic": return "<span class='entries italic'>" + list + "</span>"
		case "scaledice": case "scaledamage": return "<span class='entries " + type + "' >" + (part[2] || part[0]) + "</span>"
		case "dice": case "damage": return "<span class='entries " + type + " italic action' onclick='libraryHandleDice(event, \"" + part[0] + "\")'>" + (part[1] || part[0]) + "<span class='rolled'></span></span>"
		case "chance": return "<span class='entries " + type + " action' onclick='libraryHandleChance(event, \"" + part[0] + "\")'>" + (part[1] || part[0] + " percent") + "<span class='rolled'></span></span>"
		case "link": return "<span class='entries " + type + " italic'>" + list + "</span>"
		case "hit": return (list.charAt(0) === "+" || +list < 0 ? "" : "+") + list
		case "atk": return "<span class='entries attack italic'>" + list.replace(/./g, function (l) { return (["Ranged", "Melee", "Spell", "Weapon", "or"]["rmsw,".indexOf(l)] || l) + " " }) + " Attack:</span> "
		case "dc": return "<span class='entries difficulty-class'>DC " + list + "</span>"
		case "item": return "<a class='entries item' href='trove.html#" + libraryKey(part[0]) + "'>" + (part[2] || part[0]) + "</a>"
		case "spell": return "<a class='entries spell italic' href='spellbook.html#" + libraryKey(part[0]) + "'>" + (part[2] || part[0]) + "</a>"
		case "creature": return "<a class='entries creature' href='bestiary.html#" + libraryKey(part[0]) + "'>" + (part[2] || part[0]) + "</a>"
		case "hoard": return "<a class='entries hoard' href='treasure.html?k=h&p&r&c=" + (part[0] || 0) + "'>" + (part[2] || "Hoard") + "</a>"
		case "condition": case "skill": case "sense": case "action": case "hazard": return "<span class='entries " + type + "'>" + part[0] + "</span>"
		case "adventure": return "<span class='entries italic " + type + "'>" + part[0] + "</span>"
		case "table": return "<span class='entries italic " + type + "'>" + (part[2] || part[0]) + "</span>"
		case "book": return "<span class='entries italic " + type + "'>" + (part[3] || part[0]) + "</span>"
		case "race": return "<span class='entries italic " + type + "'>" + (part[2] || part[0]) + "</span>"
		case "filter":
			switch ( part[1] ) {
			case 'items': return "<a class='entries filter item italic' href='trove.html?" + part.slice(2).join('&') + "'>" + part[0] + "</a>"
			case 'spells': return "<a class='entries filter spell italic' href='spellbook.html?" + part.slice(2).join('&') + "'>" + part[0] + "</a>"
			case 'bestiary': return "<a class='entries filter creature italic' href='bestiary.html?" + part.slice(2).join('&').replace('challenge rating=', 'cr=').replace(/=\[&?([^\];]+);&?([^\]]+)\]/, '=$1...$2') + "'>" + part[0] + "</a>"
			default: return "<span class='entries filter italic " + (part[1] || '') + "'>" + part[0] + "</span>"
			}
		default: return "<span class='entries italic " + type + "'>" + (part[2] || part[0]) + "</span>"
		}
	})
	
	text = text.replace(/\{@i ([^{}]+)\}/g, "<span class='entries italic'>$1</span> ")
	text = text.replace(/\{@note ([^{}]+)\}/g, "<span class='entries note'>$1</span> ")
	
	text = text.replace(/\{@h\}/g, "<span class='entries hit italic'>Hit:</span> ")
	text = text.replace(/\{@recharge\}/g, "<span class='entries recharge'></span>")
	
	return text
}

function libraryResolveEntries(entries, begin, close, depth) {
	var result = ""
	
	depth = depth | 0
	
	var depthClass = depth > 0 ? " entries-depth-" + depth : ""
	
	if ( Array.isArray(entries) ) {
		result += entries.map(function (e) { return libraryResolveEntries(e, begin, close, depth) }).join("")
	} else if ( !entries ) {
		result = ""
	} else if ( typeof entries === 'string' ) {
		result = begin + entries + close
	} else if ( typeof entries === 'number' ) {
		result = begin + entries + close
	} else if ( entries.type === 'table' && Array.isArray(entries.rows) ) {
		result = "<table class='entries" + depthClass + "'>"
		
		if ( entries.caption ) {
			result += "<caption>" + entries.caption + "</caption>"
		}
		
		if ( entries.colLabels && Array.isArray(entries.colLabels) && entries.colLabels.length > 0 ) {
			var isDice = /^\s*\d*[dD]\d+\s*$/
			
			result += "<tr>" + entries.colLabels.map(function (h) { return "<th>" + (isDice.test(h) ? "{@dice " + h + "}" : h) + "</th>" }).join("") + "</tr>"
		}
		
		result += entries.rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + libraryResolveEntries(c, "", "", depth + 1) + "</td>" }).join("") + "</tr>" }).join("")
		result += "</table>"
	} else if ( entries.type === 'cell' && entries.roll ) {
		var roll = entries.roll
		
		if ( roll.entry ) {
			result = begin + roll.entry + close
		} else if ( roll.min || roll.max ) {
			result = begin + (roll.pad ? ("00" + roll.min).slice(-2) : roll.min) + "&mdash;" + (roll.pad ? ("00" + roll.max).slice(-2) : roll.max) + close
		} else if ( roll.exact ) {
			result = begin + (roll.pad ? ("00" + roll.exact).slice(-2) : roll.exact) + close
		} else {
			result = begin + roll + close
		}
	} else if ( entries.type === 'list' ) {
		var list = entries.entries || entries.items
		var text = list.filter(function (i) { return typeof i === 'string' })
		var term = list.filter(function (i) { return i.name && i.entry })
		
		if ( text.length > 0 ) {
			result = "<ul class='entries" + depthClass + "'>" + libraryResolveEntries(text, "<li>", "</li>", depth + 1) + "</ul>"
		}
		
		if ( term.length > 0 ) {
			result = "<dl class='entries compact" + depthClass + "'>" +
				term.map(function (i) { return "<dt>" + i.name + "</dt><dd>" + i.entry + "</dd>" }).join("") + "</dl>"
		}
	} else if ( entries.type === 'inset' && entries.entries ) {
		result = "<dl class='entries" + depthClass + "'><dt>" + entries.name + "</dt>" +
			libraryResolveEntries(entries.entries, "<dd>", "</dd>", depth + 1) + "</dl>"
	} else if ( entries.name && entries.entries ) {
		var spacer = "<br /><span class='indent entries" + depthClass + "'></span>"
		
		result = begin + "<span class='prominent entries" + depthClass + "'>" + entries.name + "</span> " +
			libraryResolveEntries(entries.entries, "<span class='follow entries" + depthClass + "'>", "</span>" + spacer, depth + 1) + close
		
		result = result.replace(spacer + close, close)
	} else if ( entries.entries ) {
		result = libraryResolveEntries(entries.entries, begin, close, depth + 1)
	} else {
		result = begin + entries.type + close
	}
	
	return result
}

////////////////////////////////////////////////////////////////////////////////

function libraryRenderTemplateItem(template, object) {
	var pattern = /\{([^ {}]+)\}/g
	
	return template.replace(pattern, function (match, key) { return object[key] })
}

function libraryRenderTemplateItemArray(template, array) {
	var pattern = /\{([^ {}]+)\}/g
	
	return array.map(function (item) { return template.replace(pattern, function (match, key) { return item[key] }) })
}

function libraryPopulateItem(item, renderItem) {
	var key
	
	if ( typeof item === 'string' ) {
		key = item
		item = false
	} else {
		key = item.key
	}
	
	var element = key && libraryElement('inner-' + key)
	
	if ( !element || element.childElementCount > 0 ) {
		return
	}
	
	if ( !item ) {
		var table = libraryElement('library-table')
		var list = table.libraryItemList
		
		item = table.libraryItemList[key]
		
		if ( item ) {
			delete table.libraryItemList[key]
		} else {
			return
		}
	}
	
	element.innerHTML = renderItem(item)
	
	return element
}

function libraryPopulateTable(items, renderItemTable) {
	var table = libraryElement('library-table')
	var html = renderItemTable(items)
	var item, searchableText = new Object(), renderableItem = new Object(), filterableItem = new Object()
	
	for ( item of items ) {
		renderableItem[item.key] = item
		
		if ( item.searchableText ) {
			searchableText[item.key] = item.searchableText.replace(/<[^<>]+>|&\w+;/g, ' ').replace(/\s+/g, ' ')
			delete item.searchableText
		}
		
		if ( item.filter ) {
			filterableItem[item.key] = item.filter
			delete item.filter
		}
	}
	
	table.libraryItemList = renderableItem
	table.libraryItemText = searchableText
	table.libraryItemFilters = filterableItem
	table.innerHTML = html
	
	libraryForm().addEventListener('reset', libraryFormReset)
	
	return table
}

function libraryFormReset() {
	libraryAssignCheckedToSelector('table#library-table tr.library > td.selected > input.selection', -1, -1)
	libraryFilterByText(false)
	libraryToggleUnfiltered(-1)
}

function libraryForm() {
	return libraryElement('library-form')
}

////////////////////////////////////////////////////////////////////////////////

function libraryRenderStyles(styles) {
	var separator = "\n"
	var identifier = 'library-styles'
	var element = libraryElement(identifier)
	
	if ( element ) {
		element.innerHTML += separator + styles.join(separator)
	} else {
		element = document.createElement('style')
		element.setAttribute('id', identifier)
		element.innerHTML = styles.join(separator)
		document.head.appendChild(element)
	}
}

function libraryRenderHTML(position, relativeToElement, html) {
	var element = libraryElement(relativeToElement)
	
	if ( position === 'inside' ) {
		element.innerHTML = html
	} else if ( position !== 'replace' && typeof element.insertAdjacentHTML === 'function' ) {
		element.insertAdjacentHTML(position, html)
	} else if ( position === 'afterbegin' ) {
		element.innerHTML = html + element.innerHTML
	} else if ( position === 'beforeend' ) {
		element.innerHTML = element.innerHTML + html
	} else {
		var parent = element.parentElement
		var temporary = document.createElement('DIV')
		
		temporary.innerHTML = html
		
		if ( position === 'beforebegin' || position === 'replace' ) {
			while ( temporary.firstChild ) { parent.insertBefore(temporary.firstChild, element) }
		} else if ( position === 'afterend' ) {
			if ( element.nextSibling ) {
				while ( temporary.firstChild ) { parent.insertBefore(temporary.firstChild, element.nextSibling) }
			} else {
				while ( temporary.firstChild ) { parent.appendChild(temporary.firstChild) }
			}
		}
		
		if ( position === 'replace' ) {
			parent.removeChild(element)
		}
	}
}

function libraryRenderCaptionForFilters(label, spanClasses) {
	return "<br class='filter' /><span class='filter caption " +spanClasses + "'>" + label + ":</span> "
}

function libraryRenderCheckboxFilters(filters, spanClasses, accumulateStyles) {
	var templateStyles = "input#filter-{key}:not(:checked) ~ table#library-table tr.library.{style}:not(.header) { display:none; }"
	var templateName = spanClasses ? "<span class='" + spanClasses + "'>{name}</span>" : "{name}"
	var separator = " <span class='filter'>&bull;</span> "
	
	var templateContent = "" +
		"<input id='filter-{key}' type='checkbox' checked class='filter' />" +
		"<label for='filter-{key}' class='filter' title='{title}'>" + templateName + "</label>"
	
	if ( Array.isArray(accumulateStyles) ) {
		accumulateStyles.push.apply(accumulateStyles, libraryRenderTemplateItemArray(templateStyles, filters))
	}
	
	return libraryRenderTemplateItemArray(templateContent, filters).join(separator)
}

function libraryRenderRadioFilters(filters, spanClasses, accumulateStyles) {
	var templateStyles = "input#filter-{group}-{key}:checked ~ table#library-table tr.library:not(.{style}):not(.header) { display:none; }"
	var templateName = spanClasses ? "<span class='" + spanClasses + "'>{name}</span>" : "{name}"
	var separator = " <span class='filter'>&bull;</span> "
	
	var templateContent = "" +
		"<input id='filter-{group}-{key}' name='{group}' value='{value}' type='radio' {checked} class='filter' />" +
		"<label for='filter-{group}-{key}' class='filter' title='{title}'>" + templateName + "</label>"
	
	if ( Array.isArray(accumulateStyles) ) {
		accumulateStyles.push.apply(accumulateStyles, libraryRenderTemplateItemArray(templateStyles, filters))
	}
	
	filters.unshift({
		'group':filters[0].group, 'key':'any', 'value':'any', 'checked':'checked', 'name':"Any", 'title':"Any"
	})
	
	return libraryRenderTemplateItemArray(templateContent, filters).join(separator)
}

function libraryRenderTriviaFilters(filters, spanClasses, accumulateStyles) {
	var templateName = spanClasses ? "<span class='" + spanClasses + "'>{name}</span>" : "{name}"
	var separator = " <span class='filter'>&bull;</span> "
	
	var templateStyles = "" +
		"input#filter-{key}-require:checked ~ table#library-table tr.library:not(.{style}):not(.header) { display:none; }\n" +
		"input#filter-{key}-exclude:checked ~ table#library-table tr.library.{style} { display:none; }"
	
	var templateContent = "" +
		"<input id='filter-{key}-disable' name='filter-{key}' value='-' type='radio' checked class='filter trivia' />" +
		"<input id='filter-{key}-require' name='filter-{key}' value='{upper}' type='radio' class='filter trivia' />" +
		"<input id='filter-{key}-exclude' name='filter-{key}' value='{lower}' type='radio' class='filter trivia' />" +
		"<label for='filter-{key}-disable' class='filter trivia exclude'>" + templateName + "</label>" +
		"<label for='filter-{key}-require' class='filter trivia disable'>" + templateName + "</label>" +
		"<label for='filter-{key}-exclude' class='filter trivia require'>" + templateName + "</label>"
	
	if ( Array.isArray(accumulateStyles) ) {
		accumulateStyles.push.apply(accumulateStyles, libraryRenderTemplateItemArray(templateStyles, filters))
	}
	
	return libraryRenderTemplateItemArray(templateContent, filters).join(separator)
}
function libraryRenderFilterOptionsFromExtents(filters, itemExtents) {
	var filter, key, name, value, entry, label, end
	var extents = new Object()
	var group, options = []
	var none = '!', any = '…'
	
	for ( filter of filters ) {
		if ( filter.extents ) {
			extents[filter.key] = filter.extents
			continue
		}
		
		if ( filter.extentsProperty ) {
			key = filter.extentsProperty
		} else if ( filter.transform ) {
			continue
		} else {
			key = filter.property || filter.key
		}
		
		if ( itemExtents[key] ) {
			extents[filter.key] = itemExtents[key]
		}
	}
	
	options.push('<option selected disabled value="">More Filters</option>')
	
	for ( filter of filters ) {
		if ( filter.isHidden ) { continue }
		
		value = extents[filter.key]
		name = filter.label || filter.key
		options.push('<optgroup label="' + name + '">')
		
		if ( typeof value === 'string' || typeof value === 'number' ) {
			options.push('<option value="' + ('?' + filter.key + '=' + value) + '">' + value + '</option>')
		} else if ( Array.isArray(value) ) {
			if ( filter.isNumber ) {
				if ( typeof filter.transform === 'function' ) {
					value.sort(function (a, b) { return filter.transform(a) - filter.transform(b) })
				} else {
					value.sort(function (a, b) { return a - b })
				}
			} else if ( filter.isBoolean ) {
					value.sort(function (a, b) { return b - a })
			} else {
				value.sort()
			}
			
			if ( filter.isNumber && value.length > 5 ) {
				end = value.slice(-3)
				options.push('<option value="' + ('?' + filter.key + '=' + value[0]) + '">' + value[0] + '</option>')
				options.push('<option value="' + ('?' + filter.key + '=' + value[1]) + '">' + value[1] + '</option>')
				options.push('<option value="' + ('?' + filter.key + '=' + value[2] + '…' + end[0]) + '">' + value[2] + ' … ' + end[0] + '</option>')
				options.push('<option value="' + ('?' + filter.key + '=' + end[1]) + '">' + end[1] + '</option>')
				options.push('<option value="' + ('?' + filter.key + '=' + end[2]) + '">' + end[2] + '</option>')
			} else {
				for ( entry of value ) {
					if ( typeof entry === 'boolean' ) {
						label = entry ? 'yes' : 'no'
						entry = entry ? true : none
					} else if ( entry === none ) {
						label = 'none'
					} else if ( entry === any ) {
						label = 'any'
						entry = ''
					} else {
						label = entry
					}
					
					options.push('<option value="' + ('?' + filter.key + (entry === true ? '' : '=' + entry)) + '">' + label + '</option>')
				}
			}
		} else {
			options.push('<option value="' + ('?' + filter.key + '=' + any) + '">any</option>')
		}
		
		options.push('</optgroup>')
	}
	
	options.push('<optgroup label="Special">')
	options.push('<option value="?or">or</option>')
	options.push('<option value="?shuffle">shuffle</option>')
	options.push('</optgroup>')
	
	return "<select id='library-filter-options' oninput='libraryHandleFilterOption(event)'>" + options.join(" ") + "</select>"
}

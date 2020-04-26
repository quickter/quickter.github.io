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

function libraryAssignCheckedToSelector(selector, checked) {
	var selectorChecked = selector + ':checked'
	var selectorUnchecked = selector + ':not(:checked)'
	var element, elements, index
	
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
		
		if ( element.checked !== checked ) {
			element.checked = checked
			
			if ( typeof element.onchange === 'function' ) { element.onchange() }
		}
	}
}

////////////////////////////////////////////////////////////////////////////////

function libraryToggleUnfiltered(value) {
	libraryAssignCheckedToSelector('table#library-table tr:not(.filtered) > td.name > input.toggle', value)
}

function libraryChooseUnfiltered(value) {
	libraryAssignCheckedToSelector('table#library-table tr:not(.filtered) > td.selected > input.selection', value)
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
	var selector = 'table#library-table tr.library > td.name'
	var table = libraryElement('library-table')
	var text = table.libraryItemText
	var count
	
	if ( !pattern ) {
		count = libraryAssignClassToElements(className, selector, 1, function (e) { return -1 })
		count = 0
	} else if ( pattern.search(/[[?*.|^${}\\]/) < 0 ) {
		pattern = pattern.toLowerCase()
		count = libraryAssignClassToElements(className, selector, 1, function (e) { return text[e.id.slice(5)].toLowerCase().indexOf(pattern) < 0 ? 1 : -1 })
	} else {
		try { pattern = new RegExp(pattern, 'ius') }
		catch (error) { return }
		
		count = libraryAssignClassToElements(className, selector, 1, function (e) { return text[e.id.slice(5)].search(pattern) < 0 ? 1 : -1 })
	}
	
	libraryFilterWasChanged(count)
	
	if ( count > 0 && count < 4 ) {
		libraryToggleUnfiltered(1)
	}
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
	} else {
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
	
	var matches = dice.toLowerCase().replace(/\s+/g, '').split(/(\b[+-]?\d*d?\d+\b)/g)
	var index, count = matches && matches.length
	var value, found, sides, roll, rolls = 0, modifiers = 0
	var sum = 0
	
	for ( index = 1 ; index < count ; index += 2 ) {
		value = matches[index]
		found = value.indexOf('d')
		
		if ( found < 0 ) {
			value = parseInt(value)
			
			if ( value ) {
				sum += value
				modifiers += 1
			}
		} else {
			sides = parseInt(value.slice(found + 1)) || 0
			value = found > 0 ? parseInt(value.slice(0, found)) : 1
			
			if ( sides > 1 ) {
				rolls += 1
				
				while ( value --> 0 ) {
					sum += 1 + libraryRandomInteger(sides)
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
	
	let value = 1 + libraryRandomInteger(100)
	let success = value <= chance
	
	libraryAssignClass(element, className + '-success', success ? 1 : -1)
	libraryAssignClass(element, className + '-failure', success ? -1 : 1)
	
	element.textContent = " (" + value + ")"
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
	return libraryStripDiacriticals(name.toLowerCase()).replace(/(['‘’(){}×.,:]+|[-+ \t]+|\ba\s|\bof\s|\bthe\s)/g, '')
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
		case "dice": case "damage": return "<span class='entries " + type + " italic action' onclick='libraryHandleDice(event, \"" + part[0] + "\")'>" + (part[1] || part[0]) + "<span class='rolled'></span></span>"
		case "chance": return "<span class='entries " + type + " action' onclick='libraryHandleChance(event, \"" + part[0] + "\")'>" + (part[1] || part[0] + " percent") + "<span class='rolled'></span></span>"
		case "link": return "<span class='entries " + type + " italic'>" + list + "</span>"
		case "hit": return (+list < 0 ? "" : "+") + list
		case "atk": return "<span class='entries attack italic'>" + list.replace(/./g, function (l) { return (["Ranged", "Melee", "Spell", "Weapon", "or"]["rmsw,".indexOf(l)] || l) + " " }) + " Attack:</span> "
		case "dc": return list
		case "item": return "<a class='entries item' href='items.html#" + libraryKey(part[0]) + "'>" + (part[2] || part[0]) + "</a>"
		case "spell": return "<a class='entries spell italic' href='spells.html#" + libraryKey(part[0]) + "'>" + (part[2] || part[0]) + "</a>"
		case "creature": return "<a class='entries creature' href='bestiary.html#" + libraryKey(part[0]) + "'>" + (part[2] || part[0]) + "</a>"
		case "condition": case "skill": case "sense": case "action": case "hazard": return "<span class='entries " + type + "'>" + part[0] + "</span>"
		case "filter": return (part.length > 2 && part[1] === 'spells') ? "<a class='entries spell italic' href='spells.html?" + part[2] + "'>" + part[0] + "</a>" : "<span class='entries italic " + type + "'>" + part[0] + "</span>"
		case "adventure": return "<span class='entries italic " + type + "'>" + part[0] + "</span>"
		case "table": return "<span class='entries italic " + type + "'>" + (part[2] || part[0]) + "</span>"
		case "book": return "<span class='entries italic " + type + "'>" + (part[3] || part[0]) + "</span>"
		default: return "<span class='entries italic " + type + "'>" + (part[2] || part[0]) + "</span>"
		}
	})
	
	text = text.replace(/\{@h\}/g, "<span class='entries hit italic'>Hit:</span> ")
	text = text.replace(/\{@i ([^{}]+)\}/g, "<span class='entries italic'>$1</span> ")
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
		result = begin + entries.roll.entry + close
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
	var item, searchableText = new Object(), searchableItem = new Object()
	
	for ( item of items ) {
		searchableItem[item.key] = item
		searchableText[item.key] = item.searchableText.replace(/<[^<>]+>/g, ' ').replace(/\s+/g, ' ')
	}
	
	table.libraryItemList = searchableItem
	table.libraryItemText = searchableText
	table.innerHTML = html
	
	return table
}

function libraryForm() {
	return libraryElement('library-form')
}

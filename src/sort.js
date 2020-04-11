function tableSort(tableColumn) {
	/*
		tableSort(event)
			element = event.target
		
		element.tableSort()
		tableSort(element)
		
		tableSort('id')
			element = document.getElementById(id)
		
		tableSort('id^column')
			element = document.getElementById(id)
		
		---
		
		table = element or ancestor of element
		column = column or container of element
		
		if column === 'initialize' || element === table { ... initialize table ... }
		
		data-sort-format (or arguments[1])
			column sorting format
			leading '-' reverses sort order
			
			number - parseFloat
			natural - sort integers within text in natural order
			lower - toLowerCase
			lower-locale - toLocaleLowerCase
			date, date-rfc2822, date-iso8601 - Date.parse
			locale[-flags][:locale] - Intl.Collator else localeCompare
		
		data-sort-multiple
			table supports multiple column sort
			
		data-sort-invert class='sort-invert'
			column sorts in reverse order
		
		data-sort-follow class='sort-follow'
			row follows preceding row, value is ignored
		
		data-sort-key
			cell sorted by key instead of cell content
	*/
	
	var element, column, table, index, count
	var tcell, thead, tbody, trow
	var matchClassname = /(^|\s+)(unsorted|sorted-ascending|sorted-descending)(\s+|$)/;
	var classname, classmatch
	var format, ascending = true, attribute
	var rows, sorted, values, value
	var entry, total, prior, order, array, followers
	
	if ( 0 === arguments.length && Node.ELEMENT_NODE === this.nodeType ) {
		element = this
	} else if ( tableColumn && tableColumn.target && Node.ELEMENT_NODE === tableColumn.target.nodeType ) {
		element = tableColumn.target
	} else if ( Node.ELEMENT_NODE === tableColumn.nodeType ) {
		element = tableColumn
	} else {
		column = tableColumn.indexOf('^')
		
		if ( column < 0 ) {
			table = document.getElementById(tableColumn)
		} else {
			element = document.getElementById(tableColumn.substring(0, column))
			column = tableColumn.substring(column + 1)
		}
	}
	
	while ( !table && element ) {
		if ( 'TH' === element.nodeName || 'TD' === element.nodeName ) { tcell = element }
		else if ( 'TABLE' === element.nodeName ) { table = element }
		element = element.parentNode
	}
	
	thead = table.tHead || table
	tbody = table.tBodies[0] || table
	trow = thead.rows[0]
	count = trow.cells.length
	
	if ( 'initialize' === column || tableColumn === table ) {
		var elements = table.getElementsByClassName('sortable')
		
		for ( index = elements.length ; index --> 0 ; ) {
			elements[index].addEventListener('click' , arguments.callee , false);
		}
		
		column = -1;
		for ( index = 0 ; index < count ; ++index ) {
			tcell = trow.cells[index]
			classname = tcell.className
			classmatch = classname && classname.match(matchClassname)
			
			if ( classmatch ) {
				if ( column < 0 && 'unsorted' !== classmatch[2] ) {
					column = index
					format = tcell.getAttribute('data-sort-format') || ""
					ascending = ('sorted-ascending' === classmatch[2])
				}
			} else {
				tcell.className = classname + ( classname ? " " : "" ) + "unsorted"
			}
		}
		
		if ( column < 0 ) {
			return false
		} else {
			tcell = trow.cells[column]
			classname = null
		}
	} else {
		if ( tcell ) {
			for ( column = 0 ; column < count && trow.cells[column] !== tcell ; ++column ) {}
		} else if ( 'row' === column ) {
			tcell = trow
		} else {
			if ( column < 0 ) { column += count }
			tcell = trow.cells[column]
			if ( !tcell ) { return false }
		}
		
		format = arguments[1] || ""
		if ( '/' === format.charAt(0) || '\\' === format.charAt(0) ) {
			ascending = !('/' === format.charAt(0))
			format = format.substring(1)
		}
		format = format || tcell.getAttribute('data-sort-format') || ""
		
		classname = tcell.className
		classmatch = classname && classname.match(matchClassname)
		
		if ( classmatch ) {
			if ( 'sorted-ascending' === classmatch[2] ) { ascending = false }
			
			classname = classname.replace(classmatch[0], classmatch[1] + 'sorted-' + (ascending ? 'ascending' : 'descending') + classmatch[3])
		} else {
			classname = classname + ( classname ? " " : "" ) + 'sorted-' + (ascending ? 'ascending' : 'descending')
		}
		
		attribute = table.getAttribute('data-sort-multiple')
		if ( !( +attribute || 'yes' === attribute || '' === attribute ) ) {
			classmatch = ['sorted-ascending',/(^|\s*)sorted-ascending(\s*|$)/,'sorted-descending',/(^|\s*)sorted-descending(\s*|$)/]
			count = classmatch.length
			for ( index = 0 ; index < count ; index += 2 ) {
				sorted = table.getElementsByClassName(classmatch[index])
				entry = sorted.length
				
				while ( entry --> 0 ) {
					if ( sorted[entry] === tcell ) { continue }
					
					sorted[entry].className = sorted[entry].className.replace(classmatch[index + 1], '$1unsorted$2')
				}
			}
		}
	}
	
	if ( classname && 'row' !== column ) {
		tcell.className = classname;
	}
	
	rows = Array.prototype.slice.call(tbody.rows, thead === table ? 1 : 0)
	count = rows.length
	
	sorted = new Array()
	values = new Array(count)
	followers = new Array()
	
	if ( 'reverse' === format ) {
		for ( index = 0 ; index < count ; ++index ) {
			sorted[index] = count - index - 1;
		}
	} else {
		if ( '-' === format.charAt(0) ) {
			format = format.substring(1)
			ascending = !ascending
		} else {
			attribute = tcell.getAttribute('data-sort-invert')
			
			if ( +attribute || 'yes' === attribute || '' === attribute || ( null === attribute && tcell.classList.contains('sort-invert') ) ) {
				ascending = !ascending
			}
		}
		
		prior = -1
		entry = 0
		order = ('date-dmy' === format) ? 0 : 1;
		
		for ( index = 0 ; index < count ; ++index ) {
			attribute = rows[index].getAttribute('data-sort-follow')
			
			if ( +attribute || 'yes' === attribute || '' === attribute || ( null === attribute && rows[index].classList.contains('sort-follow') ) ) {
				if ( undefined === followers[prior] ) { followers[prior] = [index] }
				else { followers[prior].push(index) }
				continue
			}
			
			value = ('row' === column) ? rows[index] : rows[index].cells[column]
			
			if ( !value ) {
				if ( undefined === followers[prior] ) { followers[prior] = [index] }
				else { followers[prior].push(index) }
				continue
			}
			
			if ( value.hasAttribute('data-sort-key') ) {
				value = value.getAttribute('data-sort-key')
			} else if ( value.childElementCount > 0 && 'INPUT' === value.firstElementChild.nodeName ) {
				value = value.firstElementChild
				value = (value.checked === undefined) ? value.value || "" : value.checked
			} else {
				value = value.textContent.trim()
			}
			
			if ( 'number' === format ) {
				value = parseFloat(value)
				if ( isNaN(value) ) { value = null }
			} else if ( 'natural' === format ) {
				value = value.replace(/\d+/g, n => "00000000000000000000".substring(n.length) + n)
			} else if ( 'lower' === format ) {
				value = value.toLowerCase()
			} else if ( 'lower-locale' === format ) {
				value = value.toLocaleLowerCase()
			} else if ( 'date' === format || 'date-rfc2822' === format || 'date-iso8601' === format ) {
				value = Date.parse(value) || null;
			}
			
			prior = index
			sorted[entry++] = index
			values[index] = value
		}
		
		if ( 'locale' === format.substring(0, 6) ) {
			var locale = false, options = new Object()
			
			index = format.indexOf(':')
			
			if ( index > 0 ) {
				locale = format.substring(index + 1)
				format = format.substring(0 , index)
				if ( locale.indexOf(':') > 0 ) locale = locale.split(':')
			}
			
			if ( !locale ) { locale = navigator.language }
			if ( format.indexOf('-numeric') > 0 || format.indexOf('#') > 0 ) { options.numeric = true }
			if ( format.indexOf('-ignorePunctuation') > 0 || format.indexOf('!') > 0 ) { options.ignorePunctuation = true }
			if ( format.indexOf('-upper') > 0 || format.indexOf('Z') > 0 ) { options.caseFirst = 'upper' }
			if ( format.indexOf('-lower') > 0 || format.indexOf('z') > 0 ) { options.caseFirst = 'lower' }
			if ( format.indexOf('-variant') > 0 || format.indexOf('$') > 0 ) { options.sensitivity = 'variant' }
			if ( format.indexOf('-accent') > 0 || format.indexOf('^') > 0 ) { options.sensitivity = 'accent' }
			if ( format.indexOf('-case') > 0 || format.indexOf('~') > 0 ) { options.sensitivity = 'case' }
			if ( format.indexOf('-base') > 0 || format.indexOf('=') > 0 ) { options.sensitivity = 'base' }
			
			if ( window['Intl'] && 'function' === typeof Intl.Collator ) {
				var collator = new Intl.Collator(locale, options)
				
				sorted.sort(function (inA, inB) {
					var a = values[inA], b = values[inB], c
					if ( null === a || null === b ) {
						c = (a === b) ? 0 : (null === a) ? 1 : -1
					} else {
						c = collator.compare(a , b)
						if ( !ascending ) { c = -c }
					}
					
					return c || (inA - inB)
				})
			} else {
				sorted.sort(function (inA, inB) {
					var a = values[inA], b = values[inB], c
					if ( null === a || null === b ) {
						c = (a === b) ? 0 : (null === a) ? 1 : -1
					} else {
						c = a.localeCompare(b, locale, options)
						if ( !ascending ) { c = -c }
					}
					
					return c || (inA - inB)
				})
			}
		} else {
			sorted.sort(function (inA, inB) {
				var a = values[inA], b = values[inB], c
				if ( null === a || null === b ) {
					c = (a === b) ? 0 : (null === a) ? 1 : -1
				} else {
					c = (a > b) ? 1 : (a < b) ? -1 : 0
					if ( !ascending ) { c = -c }
				}
				
				return c || (inA - inB)
			})
		}
	}
	
	for ( index = 0, count = sorted.length ; index < count ; ++index ) {
		tbody.appendChild(rows[sorted[index]])
		
		array = followers[sorted[index]]
		total = ( undefined === array ) ? 0 : array.length
		for ( entry = 0 ; entry < total ; ++entry ) {
			tbody.appendChild(rows[array[entry]])
		}
	}
	
	return false
}

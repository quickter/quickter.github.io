'not strict';

var treasureDefaults = {
	mergeItemPoints:false,
	forceMagicItemTable:null,
	excludeMagicItemTable:false,
	coinsPerPound:50,
	minimumPoundsToDisplayWeight:20,
	times:" x ",
}

function treasureRandomInteger(count) {
	if ( crypto && crypto.getRandomValues ) {
		var randomValues = new Uint32Array(1)
		
		crypto.getRandomValues(randomValues)
		
		return randomValues[0] % count
	} else {
		return Math.floor(Math.random() * Math.floor(count)) | 0
	}
}

function treasureRoundingToRandomInteger(number) {
	var integer = Math.floor(number)
	var rounded = Math.random() < (number - integer) ? 1 : 0
	
	return integer + rounded
}

function treasureFrequencyElement(array) {
	var sum = array.reduce(treasureFrequencySum, 0)
	
	if ( sum > 0 ) {
		var value = treasureRandomInteger(sum)
		
		for ( var element of array ) {
			value -= element.frequency | 0
			
			if ( value < 0 ) {
				return element
			}
		}
	}
	
	return array[treasureRandomInteger(array.length)]
}

function treasureFrequencyEntries(table, quantity) {
	var result = []
	
	while ( quantity --> 0 ) {
		result.push(treasureFrequencyElement(table))
	}
	
	return result
}

function treasureFrequencyEntriesForEntryCounts(table, entryCounts) {
	var result = []
	var quantity, index, count = table.length
	var array
	
	for ( index = 0 ; index < count ; ++index ) {
		quantity = entryCounts[index]
		array = table[index].table
		
		while ( quantity --> 0 ) {
			result.push(treasureFrequencyElement(array))
		}
	}
	
	return result
}

function treasureFrequencyFromPrefixValue(string) {
	var index = string.indexOf(':')
	var frequency = 1
	
	if ( index > 0 ) {
		frequency = parseInt(string.slice(0, index))
		string = string.slice(index + 1)
		
		if ( isNaN(frequency) ) {
			frequency = 1
		}
	}
	
	return {'frequency':frequency, 'value':string}
}

function treasureFrequencyPrefix(array) {
	if ( Array.isArray(array) ) {
		return treasureFrequencyElement(array.map(treasureFrequencyFromPrefixValue)).value
	} else {
		return array
	}
}

function treasureDieRoll(sides, rolls) {
	var sum = 0
	
	while ( rolls --> 0 ) {
		sum += 1 + treasureRandomInteger(sides)
	}
	
	return sum
}

function treasureDiceRoll(dice, quantity) {
	var roll = parseInt(dice.roll) || 1
	var sides = parseInt(dice.die) || 1
	var times = parseInt(dice.times) || 1
	var add = parseInt(dice.add) || 0
	
	if ( quantity > 1 ) {
		roll *= quantity
		add *= quantity
	}
	
	return treasureDieRoll(sides, roll) * times + add
}

function treasureSum(sum, value) {
	return sum + value
}

function treasureFrequencySum(sum, entry) {
	return sum + (entry.frequency | 0)
}

function treasureCoalesceArrayElements(array, times) {
	var result = []
	var count, counts = new Object()
	var element
	
	for ( element of array ) {
		counts[element] = (counts[element] || 0) + 1
	}
	
	for ( element of array ) {
		if ( counts[element] > 1 ) { result.push(element + times + counts[element]) }
		else if ( counts[element] > 0 ) { result.push(element) }
		else { continue }
		
		delete counts[element]
	}
	
	return result
}

function treasureEntryCountsForLevels(table, levels) {
	var counts = []
	var entry, level, index, quantity
	
	for ( index = 0 ; index < table.length ; ++index ) {
		counts[index] = 0
	}
	
	for ( level of levels ) {
		index = typeof level === 'string' ? level.indexOf('x') : -1
		
		if ( index < 0 ) {
			quantity = 1
			level = +level
		} else {
			quantity = +level.slice(index + 1)
			level = level.slice(0, index)
		}
		
		index = table.length
		
		while ( index --> 1 ) {
			if ( table[index].cr <= level ) {
				break
			}
		}
		
		counts[index] += quantity
	}
	
	return counts
}

function treasurePartyHoardsForLevel(array, level) {
	var count = array.length
	var index, entry
	var result = []
	var limit, range, rolls
	
	for ( index = 0 ; index < count ; ++index ) {
		entry = array[index]
		rolls = 0
		range = level - entry.cr + 1
		limit = entry.party_hoards.length
		
		if ( range > 0 ) {
			rolls = entry.party_hoards.slice(0, range).reduce(treasureSum, 0)
		}
		
		if ( range > limit && index + 1 >= count ) {
			rolls += (range - limit) * entry.party_hoards[limit - 1]
		}
		
		result.push(rolls)
	}
	
	return result
}

function treasureParseLevels(value, partitioned) {
	var result = []
	var multipliers = "*x×✕"
	var matches = value.split(/(\D+)/g)
	var index, count = matches.length
	var level, times
	
	for ( index = 0 ; index < count ; index += 2 ) {
		level = matches[index]
		times = result.length > 0 ? matches[index - 1].trim() : ''
		
		if ( !level ) {
			continue
		} else if ( !times || multipliers.indexOf(times) < 0 ) {
			result.push(level)
		} else if ( partitioned ) {
			times = level
			level = result[result.length - 1]
			
			while ( times --> 1 ) {
				result.push(level)
			}
		} else {
			result[result.length - 1] += 'x' + level
		}
	}
	
	return result
}

function treasureEntryCountsForPartyLevels(array, levels, scalar) {
	var counts = []
	var level, index, count, value, quantity, hoards
	
	for ( index = 0, count = array.length ; index < count ; ++index ) {
		counts[index] = 0
	}
	
	for ( level of levels ) {
		index = typeof level === 'string' ? level.indexOf('x') : -1
		
		if ( index < 0 ) {
			quantity = 1
			level = +level
		} else {
			quantity = +level.slice(index + 1)
			level = level.slice(0, index)
		}
		
		hoards = treasurePartyHoardsForLevel(array, level)
		
		for ( index = 0, count = hoards.length ; index < count ; ++index ) {
			counts[index] += hoards[index] * quantity
		}
	}
	
	for ( index = 0, count = array.length ; index < count ; ++index ) {
		value = counts[index]
		if ( scalar > 0 ) { value *= scalar }
		counts[index] = treasureRoundingToRandomInteger(value)
	}
	
	return counts
}

function treasureCoins(treasure, tableRows, entryCounts) {
	var result = []
	var accumulate = new Object()
	var element, coin, sum, key
	var quantity, index, count = tableRows.length
	var array, value
	
	for ( coin of treasure.coins ) {
		key = coin.key
		sum = 0
		array = []
		
		for ( index = 0 ; index < count ; ++index ) {
			if ( entryCounts ) {
				quantity = entryCounts[index] || 0
				element = tableRows[index].coins
			} else {
				quantity = 1
				element = tableRows[index]
			}
			
			if ( quantity > 0 && element[key] ) {
				value = treasureDiceRoll(element[key], quantity)
				array.push(value)
				sum += value * coin.cp
			}
		}
		
		if ( sum > 0 ) {
			result.push({'table':'coins', 'key':key, 'count':array, 'value':sum})
		}
	}
	
	return result
}

function treasureValuables(tableRows, quantityPerEntry) {
	var result = []
	var tables = ["gem", "art"]
	var keys = []
	var accumulate = new Object()
	var element, table, key, count, tableKey
	
	for ( element of tableRows ) {
		for ( table of tables ) {
			if ( element[table] ) {
				key = element[table].value
				count = quantityPerEntry > 0 ? treasureDiceRoll(element[table], quantityPerEntry) : 1
				tableKey = table + key
				
				if ( keys.indexOf(key) < 0 ) {
					keys.push(key)
				}
				
				if ( accumulate[tableKey] ) {
					accumulate[tableKey].count.push(count)
				} else {
					accumulate[tableKey] = {'table':table, 'key':key, 'count':[count]}
				}
			}
		}
	}
	
	keys.sort(function sort(a, b) { return +a > +b })
	
	for ( table of tables ) {
		for ( key of keys ) {
			tableKey = table + key
			
			if ( accumulate[tableKey] ) {
				accumulate[tableKey].value = 100 * key * accumulate[tableKey].count.reduce(treasureSum, 0)
				result.push(accumulate[tableKey])
			}
		}
	}
	
	return result
}

function treasureItems(tableRows, quantityPerEntry) {
	var result = []
	var keys = ["i", "h", "g", "f", "e", "d", "c", "b", "a"]
	var prefix = "magic_"
	var accumulate = new Object()
	var element, key, count, tableKey
	
	for ( element of tableRows ) {
		for ( key of keys ) {
			if ( element[prefix + key] ) {
				count = quantityPerEntry > 0 ? treasureDiceRoll(element[prefix + key], quantityPerEntry) : 1
				
				if ( accumulate[key] ) {
					accumulate[key].count.push(count)
				} else {
					accumulate[key] = {'table':'magic', 'key':key, 'count':[count]}
				}
			}
		}
	}
	
	for ( key of keys ) {
		if ( accumulate[key] ) {
			result.push(accumulate[key])
		}
	}
	
	return result
}

function treasureColeItemsForEntryCounts(table, entryCounts, mergeItemPoints) {
	var result = []
	var quantity, index, count = table.length
	var hoard
	
	var pointsArray
	var pointsLimit = 24
	var pointsDie = 6
	var point, points
	
	var keys = ["i", "h", "g", "f", "e", "d", "c", "b", "a"]
	var prefix = "magic_"
	var entry, die, key
	var itemKeys = [], itemCounts = new Object()
	
	mergeItemPoints = mergeItemPoints || treasureDefaults.mergeItemPoints
	
	for ( index = 0 ; index < count ; ++index ) {
		quantity = entryCounts[index]
		if ( !(quantity > 0) ) { continue }
		hoard = table[index]
		pointsArray = []
		
		for ( point = 0 ; point < quantity ; ++point ) {
			points = quantity - point
			
			if ( points < 1 || mergeItemPoints > 0 ) {
				points = treasureDieRoll(pointsDie, Math.ceil(points * pointsLimit / pointsDie))
				point = quantity
			} else {
				points = treasureDieRoll(pointsDie, Math.ceil(pointsLimit / pointsDie))
			}
			
			pointsArray.push(points)
		}
		
		for ( points of pointsArray ) {
			while ( points > 0 ) {
				entry = treasureFrequencyElement(hoard.table)
				die = 0
				
				for ( key of keys ) {
					if ( !entry[prefix + key] ) { continue }
					
					die = Math.max(die, entry[prefix + key].die)
					itemCounts[key] = 1 + (itemCounts[key] || 0)
				}
				
				points -= pointsLimit / (die > 0 ? die : 4)
			}
		}
	}
	
	for ( key of keys ) {
		if ( itemCounts[key] ) {
			result.push({'table':'magic', 'key':key, 'count':[itemCounts[key]]})
		}
	}
	
	return result
}

function treasureSummaryForEntryCounts(array, entryCounts, times) {
	var result = []
	var quantity, index, count = array.length
	
	times = times || treasureDefaults.times
	
	for ( index = 0 ; index < count ; ++index ) {
		quantity = entryCounts[index]
		if ( !(quantity > 0) ) { continue }
		
		result.push(array[index].concise + (quantity > 1 ? times + quantity : ''))
	}
	
	return result.join(", ")
}

function treasureIndividual(treasure, levels) {
	var counts = treasureEntryCountsForLevels(treasure.individual, levels)
	var entries = treasureFrequencyEntriesForEntryCounts(treasure.individual, counts)
	var result = treasureCoins(treasure, entries)
	
	result.unshift({'description':"Individual Treasure: Challenge " + treasureSummaryForEntryCounts(treasure.individual, counts)})
	
	return result
}

function treasureValuablesFromRawHoard(treasure, levels) {
	var counts = treasureEntryCountsForLevels(treasure.hoard, levels)
	var entries = treasureFrequencyEntriesForEntryCounts(treasure.hoard, counts)
	var result = treasureValuables(entries, 1)
	
	result.unshift({'description':"Treasure Hoard Valuables: Challenge " + treasureSummaryForEntryCounts(treasure.hoard, counts)})
	
	return result
}

function treasureItemsFromRawHoard(treasure, levels) {
	var counts = treasureEntryCountsForLevels(treasure.hoard, levels)
	var entries = treasureFrequencyEntriesForEntryCounts(treasure.hoard, counts)
	var result = treasureItems(entries, 1)
	
	result.unshift({'description':"Treasure Hoard Items: Challenge " + treasureSummaryForEntryCounts(treasure.hoard, counts)})
	
	return result
}

function treasureRawEntry(treasure, counts, partyItems) {
	var entries = treasureFrequencyEntriesForEntryCounts(treasure.hoard, counts)
	var coins = treasureCoins(treasure, treasure.hoard, counts)
	var valuables = treasureValuables(entries, 1)
	var items = Array.isArray(partyItems) ? partyItems : treasureItems(entries, 1)
	var result = items.concat(valuables, coins)
	
	return result
}

function treasureRawHoard(treasure, levels) {
	var counts = treasureEntryCountsForLevels(treasure.hoard, levels)
	var result = treasureRawEntry(treasure, counts)
	
	result.unshift({'description':"Treasure Hoard: Challenge " + treasureSummaryForEntryCounts(treasure.hoard, counts)})
	
	return result
}

function treasureRawParty(treasure, levels, scalar) {
	var list = treasure.hoard
	var counts = treasureEntryCountsForLevels(list, levels)
	var hoards = []
	var items = [], itemKeys = [], itemCounts = new Object()
	var index, count = list.length
	var lower, quantity, entry, key, value
	
	for ( index = 0 ; index < count ; ++index ) {
		hoards[index] = 0
		quantity = +counts[index]
		if ( !(quantity > 0) ) { continue }
		
		for ( lower = 0 ; lower <= index ; ++lower ) {
			for ( entry of list[lower].party_items ) {
				key = entry.magic
				value = entry.quantity * quantity
				if ( scalar > 0 ) { value *= scalar }
				value = treasureRoundingToRandomInteger(value)
				
				if ( itemCounts[key] ) {
					itemCounts[key].push(value)
				} else {
					itemCounts[key] = [value]
					itemKeys.push(key)
				}
			}
			
			hoards[lower] += list[lower].party_hoards.reduce(treasureSum, 0) * quantity
		}
	}
	
	for ( index = 0 ; index < count ; ++index ) {
		value = hoards[index]
		if ( scalar > 0 ) { value *= scalar }
		hoards[index] = treasureRoundingToRandomInteger(value)
	}
	
	itemKeys.sort()
	itemKeys.reverse()
	
	for ( key of itemKeys ) {
		items.push({'table':'magic', 'key':key, 'count':itemCounts[key]})
	}
	
	var result = treasureRawEntry(treasure, hoards, items)
	
	result.unshift({'description':"Party, Treasure Hoards: Challenge " + treasureSummaryForEntryCounts(treasure.hoard, hoards)})
	
	return result
}

function treasureColeEntry(treasure, counts, mergeItemPoints) {
	var entries = treasureFrequencyEntriesForEntryCounts(treasure.hoard, counts)
	
	var coins = treasureCoins(treasure, treasure.hoard, counts)
	var valuables = treasureValuables(entries, 1)
	var items = treasureColeItemsForEntryCounts(treasure.hoard, counts, mergeItemPoints)
	
	return items.concat(valuables, coins)
}

function treasureColeHoard(treasure, levels, mergeItemPoints) {
	var counts = treasureEntryCountsForLevels(treasure.hoard, levels)
	var result = treasureColeEntry(treasure, counts, mergeItemPoints)
	
	result.unshift({'description':"Treasure Hoard: Challenge " + treasureSummaryForEntryCounts(treasure.hoard, counts)})
	
	return result
}

function treasureColeParty(treasure, levels, scalar, mergeItemPoints) {
	var counts = treasureEntryCountsForPartyLevels(treasure.hoard, levels, scalar)
	var result = treasureColeEntry(treasure, counts, mergeItemPoints)
	
	result.unshift({'description':"Party Treasure: Challenge " + treasureSummaryForEntryCounts(treasure.hoard, counts)})
	
	return result
}

function treasureLookupMagicItemEntry(treasure, lookup, entry, times) {
	var armor = entry.armor || false, armorItem, armorName
	var weapon = entry.weapon || false, weaponItem, weaponName
	var weight = 0
	
	if ( weapon ) {
		if ( weapon.length > 0 ) {
			weapon = treasureFrequencyPrefix(weapon)
		} else {
			weapon = treasureFrequencyElement(treasure.magic.weapons).weapon
		}
		
		weaponItem = lookup.weapons
		weaponItem = weaponItem && weaponItem[weapon]
		weaponName = weaponItem && weaponItem.name
		weaponName = weaponName || weapon
		
		if ( weaponItem ) { weight = weaponItem.weight || 0 }
	}
	
	if ( armor ) {
		armor = treasureFrequencyPrefix(armor)
		armorItem = lookup.armors
		armorItem = armorItem && armorItem[armor]
		armorName = armorItem && armorItem.name
		armorName = armorName || armor
		
		if ( armorItem ) { weight = armorItem.weight || 0 }
	}
	
	var itemName = entry.name
	var integrate, variant = entry.variant || false
	var quantity = entry.quantity ? treasureDiceRoll(entry.quantity) : 0
	var words, description, reference, suffix = ""
	
	times = times || treasureDefaults.times
	
	if ( entry.bonus ) {
		itemName += (entry.bonus < 0 ? " " : " +") + entry.bonus
	}
	
	if ( quantity > 0 ) {
		if ( variant && Array.isArray(variant) ) {
			var variants = []
			
			while ( quantity --> 0 ) {
				variants.push(treasureFrequencyPrefix(variant))
			}
			
			variant = variants
			variants = treasureCoalesceArrayElements(variants, times)
			suffix += " (" + variants.join(", ") + ")"
		} else if ( entry.unit ) {
			suffix += " (" + quantity + " " + entry.unit + ")"
		} else {
			suffix += times + quantity
		}
	} else {
		if ( variant ) {
			integrate = entry.integrate
			variant = treasureFrequencyPrefix(variant)
			if ( !integrate && integrate !== 0 ) { integrate = "$" }
			
			switch ( integrate ) {
			case "of": case "from": itemName += " " + integrate + " " + variant; break
			case "()": itemName += " (" + variant + ")"; break
			case ",": itemName += ", " + variant; break
			case "$": suffix += " (" + variant + ")"; break
			default: words = itemName.split(" "); words.splice(integrate, 0, "" + variant); itemName = words.join(" "); break
			}
		}
	}
	
	if ( armor ) { suffix += ", " + armorName }
	if ( weapon ) { suffix += ", " + weaponName }
	if ( entry.weight ) { weight = entry.weight }
	
	description = itemName + suffix
	
	if ( entry.key ) {
		reference = "{@item " + entry.key + "||" + itemName + "}" + suffix
	} else {
		reference = "{@item " + itemName + "}" + suffix
	}
	
	return {'name':itemName, 'armor':armor, 'weapon':weapon, 'variant':variant, 'quantity':quantity, 'bonus':entry.bonus, 'weight':weight, 'reference':reference, 'description':description}
}

function treasureLookupMagicItemKey(treasure, lookup, key, times) {
	var entry
	
	while ( key && treasure.magic[key] ) {
		entry = treasureFrequencyElement(treasure.magic[key])
		key = entry.items
	}
	
	return entry && treasureLookupMagicItemEntry(treasure, lookup, entry, times)
}

function treasureLookupItems(treasure, lookup, tableKeyCounts, options) {
	var count
	var entry, key, item, name, prefix
	
	var times = options && options.times || treasureDefaults.times
	var forceMagicItemTable = options && options.forceMagicItemTable || treasureDefaults.forceMagicItemTable || null
	var excludeMagicItemTable = options && options.excludeMagicItemTable || treasureDefaults.excludeMagicItemTable || false
	var coinsPerPound = options && options.coinsPerPound || treasureDefaults.coinsPerPound || 50
	
	for ( entry of tableKeyCounts ) {
		if ( entry.table === 'hoard' ) {
			entry.descriptions = [entry.count + times + entry.name]
		}
		
		if ( entry.table === 'coins' ) {
			count = entry.count.reduce(treasureSum, 0)
			entry.descriptions = [count + entry.key]
			entry.references = [count + "{@treasure-coin " + entry.key + "}"]
			entry.pounds = count / coinsPerPound
		}
		
		if ( entry.table === 'gem' || entry.table === 'art' ) {
			entry.names = []
			entry.references = []
			entry.descriptions = []
			
			for ( count of entry.count ) {
				name = treasureFrequencyElement(treasure[entry.table][entry.key])
				prefix = count + times + entry.key + "gp "
				
				entry.names.push(name)
				entry.descriptions.push(prefix + name)
				entry.references.push(prefix + "{@treasure-" + entry.table + " " + entry.key + "||" + name + "}")
			}
		}
		
		if ( entry.table === 'magic' ) {
			entry.items = []
			entry.references = []
			entry.descriptions = []
			
			for ( count of entry.count ) {
				while ( count --> 0 ) {
					key = forceMagicItemTable || entry.key
					prefix = excludeMagicItemTable > 0 ? "" : key.toUpperCase() + ": "
					item = treasureLookupMagicItemKey(treasure, lookup, key, times)
					
					if ( item ) {
						entry.items.push(item)
						entry.descriptions.push(prefix + item.description)
						entry.references.push(prefix + item.reference)
						entry.pounds = item.weight
					}
				}
			}
			
			entry.references = treasureCoalesceArrayElements(entry.references, times)
			entry.descriptions = treasureCoalesceArrayElements(entry.descriptions, times)
		}
	}
}

function treasureValueSummary(gp, pounds, minimumPoundsToDisplayWeight) {
	minimumPoundsToDisplayWeight = minimumPoundsToDisplayWeight || treasureDefaults.minimumPoundsToDisplayWeight
	
	if ( pounds > minimumPoundsToDisplayWeight ) {
		var weighs = pounds > 4000 ? (pounds / 2000).toFixed(2) + " tons" : Math.floor(pounds) + "lb"
		
		return "(Total " + gp + "gp, Weighs " + weighs + ")"
	} else {
		return "(Total " + gp + "gp)"
	}
}

function treasureDescriptions(tableKeyCounts, property, minimumPoundsToDisplayWeight) {
	var descriptions = []
	var entry, value, add
	var index, count, sum = 0, pounds = 0
	
	for ( entry of tableKeyCounts ) {
		value = (property === 'references' ? entry.references : null) || entry.descriptions
		
		if ( value ) {
			if ( entry.summarize && (sum > 0 || pounds > 0) ) {
				descriptions.push(treasureValueSummary(sum / 100, pounds, minimumPoundsToDisplayWeight))
				sum = 0
				pounds = 0
			}
			
			descriptions.push.apply(descriptions, value)
		} else if ( entry.count ) {
			descriptions.push(entry.count.reduce(treasureSum, 0) + " " + entry.table + " " + entry.key)
		} else if ( entry.description ) {
			descriptions.push(entry.description)
		}
		
		if ( entry.value ) { sum += +entry.value }
		if ( entry.pounds ) { pounds += +entry.pounds }
	}
	
	if ( sum > 0 ) {
		descriptions.push(treasureValueSummary(sum / 100, pounds, minimumPoundsToDisplayWeight))
	}
	
	return descriptions
}

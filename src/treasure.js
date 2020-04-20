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
	var sum = array.reduce((s, e) => s + (e.frequency | 0), 0)
	
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

function treasureEntryForLevel(array, level) {
	var index = array.length
	
	while ( index --> 1 ) {
		if ( array[index].cr <= level ) {
			return array[index]
		}
	}
	
	return array[0]
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
			rolls = entry.party_hoards.slice(0, range).reduce((s, v) => s + v, 0)
		}
		
		if ( range > limit && index + 1 >= count ) {
			rolls += (range - limit) * entry.party_hoards[limit - 1]
		}
		
		result.push(rolls)
	}
	
	return result
}

function treasureCoins(treasure, tableRows, quantityPerEntry) {
	var result = []
	var accumulate = new Object()
	var element, coin, count, key
	
	for ( element of tableRows ) {
		for ( coin of treasure.coins ) {
			key = coin.key
			
			if ( element[key] ) {
				count = treasureDiceRoll(element[key], quantityPerEntry)
				
				if ( accumulate[key] ) {
					accumulate[key].count.push(count)
				} else {
					accumulate[key] = {'table':'coins', 'key':key, 'count':[count]}
				}
			}
		}
	}
	
	for ( coin of treasure.coins ) {
		key = coin.key
		
		if ( accumulate[key] ) {
			accumulate[key].value = coin.cp * accumulate[key].count.reduce((s, v) => s + v, 0)
			result.push(accumulate[key])
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
				
				if ( !keys.includes(key) ) {
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
	
	keys.sort((a, b) => +a > +b)
	
	for ( table of tables ) {
		for ( key of keys ) {
			tableKey = table + key
			
			if ( accumulate[tableKey] ) {
				accumulate[tableKey].value = 100 * key * accumulate[tableKey].count.reduce((s, v) => s + v, 0)
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

function treasureItemsUsingPoints(hoard, pointsArray, pointsLimit) {
	var result = []
	var keys = ["i", "h", "g", "f", "e", "d", "c", "b", "a"]
	var prefix = "magic_"
	var accumulate = new Object()
	var points, entry, die, key
	
	for ( points of pointsArray ) {
		while ( points > 0 ) {
			entry = treasureFrequencyElement(hoard.table)
			die = 0
		
			for ( key of keys ) {
				if ( entry[prefix + key] ) {
					die = Math.max(die, entry[prefix + key].die)
				
					if ( accumulate[key] ) {
						accumulate[key].count.push(1)
					} else {
						accumulate[key] = {'table':'magic', 'key':key, 'count':[1]}
					}
				}
			}
			
			points -= pointsLimit / (die > 0 ? die : 4)
		}
	}
	
	for ( key of keys ) {
		if ( accumulate[key] ) {
			result.push(accumulate[key])
		}
	}
	
	return result
}

function treasureColeItems(hoard, quantity, mergeItemPoints) {
	var pointsArray = []
	var pointsLimit = 24
	var pointsDie = 6
	var index, points
	
	mergeItemPoints = mergeItemPoints || treasureDefaults.mergeItemPoints
	quantity = quantity > 0 ? quantity : 1
	
	for ( index = 0 ; index < quantity ; ++index ) {
		points = quantity - index
		
		if ( points < 1 || mergeItemPoints > 0 ) {
			points = treasureDieRoll(pointsDie, Math.ceil(points * pointsLimit / pointsDie))
			index = quantity
		} else {
			points = treasureDieRoll(pointsDie, Math.ceil(pointsLimit / pointsDie))
		}
		
		pointsArray.push(points)
	}
	
	return treasureItemsUsingPoints(hoard, pointsArray, pointsLimit)
}

function treasureIndividual(treasure, level, quantity) {
	var entry = treasureEntryForLevel(treasure.individual, level)
	var entries = treasureFrequencyEntries(entry.table, quantity || 1)
	
	return treasureCoins(treasure, entries, 1)
}

function treasureValuablesFromRawHoard(treasure, level, quantity) {
	var entry = treasureEntryForLevel(treasure.hoard, level)
	var entries = treasureFrequencyEntries(entry.table, quantity || 1)
	
	return treasureValuables(entries, 1)
}

function treasureItemsFromRawHoard(treasure, level, quantity) {
	var entry = treasureEntryForLevel(treasure.hoard, level)
	var entries = treasureFrequencyEntries(entry.table, quantity || 1)
	
	return treasureItems(entries, 1)
}

function treasureRawHoard(treasure, level, quantity) {
	var entry = treasureEntryForLevel(treasure.hoard, level)
	var entries = treasureFrequencyEntries(entry.table, quantity || 1)
	
	var coins = treasureCoins(treasure, [entry.coins], quantity || 1)
	var valuables = treasureValuables(entries, 1)
	var items = treasureItems(entries, 1)
	
	return items.concat(valuables, coins)
}

function treasureRawParty(treasure, level, quantity) {
	var aggregate = []
	var list = treasure.hoard
	var index, count = list.length
	var entry, hoards, entries, coins, valuables, item, items, rolls
	
	quantity = quantity || 1
	
	for ( index = 0 ; index < count && list[index].cr <= level ; ++index ) {
		entry = list[index]
		hoards = entry.party_hoards.reduce((s, v) => s + v, 0)
		entries = treasureFrequencyEntries(entry.table, hoards * quantity)
		
		coins = treasureCoins(treasure, [entry.coins], hoards * quantity)
		valuables = treasureValuables(entries, 1)
		items = []
		
		for ( item of entry.party_items ) {
			rolls = treasureRoundingToRandomInteger(item.quantity * quantity)
			
			if ( rolls > 0 ) {
				items.push({'table':'magic', 'key':item.magic, 'count':[rolls]})
			}
		}
		
		items.sort((a, b) => a.key < b.key)
		items.unshift({'table':'hoard', 'key':entry.cr, 'count':hoards * quantity, 'name':entry.name})
		aggregate.push(items.concat(valuables, coins))
	}
	
	aggregate.reverse()
	
	return aggregate.concat.apply([], aggregate)
}

function treasureColeEntry(treasure, hoard, quantity, mergeItemPoints) {
	var entries = treasureFrequencyEntries(hoard.table, quantity)
	var coins = treasureCoins(treasure, [hoard.coins], quantity)
	var valuables = treasureValuables(entries, 1)
	var items = treasureColeItems(hoard, quantity, mergeItemPoints)
	
	return items.concat(valuables, coins)
}

function treasureColeHoard(treasure, level, quantity, mergeItemPoints) {
	var hoard = treasureEntryForLevel(treasure.hoard, level)
	
	return treasureColeEntry(treasure, hoard, quantity || 1, mergeItemPoints)
}

function treasureColeParty(treasure, level, quantity, mergeItemPoints) {
	var aggregate = []
	var quantities = treasurePartyHoardsForLevel(treasure.hoard, level)
	var index, count = quantities.length
	var hoard, value, treasures
	
	for ( index = 0 ; index < count ; ++index ) {
		hoard = treasure.hoard[index]
		value = quantities[index] * (quantity || 1)
		
		if ( value > 0 ) {
			treasures = treasureColeEntry(treasure, hoard, value, mergeItemPoints)
			treasures.unshift({'table':'hoard', 'key':hoard.cr, 'count':value, 'name':hoard.name})
			aggregate.push(treasures)
		}
	}
	
	aggregate.reverse()
	
	return aggregate.concat.apply([], aggregate)
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
			count = entry.count.reduce((s, v) => s + v, 0)
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
		} else {
			descriptions.push(entry.count.reduce((s, v) => s + v, 0) + " " + entry.table + " " + entry.key)
		}
		
		if ( entry.value ) { sum += +entry.value }
		if ( entry.pounds ) { pounds += +entry.pounds }
	}
	
	if ( sum > 0 ) {
		descriptions.push(treasureValueSummary(sum / 100, pounds, minimumPoundsToDisplayWeight))
	}
	
	return descriptions
}

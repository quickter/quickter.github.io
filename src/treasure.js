function treasureRandomInteger(count) {
	if ( crypto && crypto.getRandomValues ) {
		var randomValues = new Uint32Array(1)
		
		crypto.getRandomValues(randomValues)
		
		return randomValues[0] % count
	} else {
		return Math.floor(Math.random() * Math.floor(count)) | 0
	}
}

function treasureFrequencyElement(array) {
	var sum = array.reduce((s, e) => s + (e.frequency | 0), 0)
	
	if ( sum > 0 ) {
		var value = treasureRandomInteger(sum)
		var save = value
		
		for ( var element of array ) {
			if ( value < element.frequency ) {
				return element
			}
			
			value -= (element.frequency | 0)
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

function treasureCoins(treasure, entries, quantityPerEntry) {
	var result = []
	var accumulate = new Object()
	var element, coin, count, key
	
	for ( element of entries ) {
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

function treasureValuables(entries, quantityPerEntry) {
	var result = []
	var tables = ["gem", "art"]
	var keys = []
	var accumulate = new Object()
	var element, table, key, count, tableKey
	
	for ( element of entries ) {
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

function treasureItems(entries, quantityPerEntry) {
	var result = []
	var keys = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
	var prefix = "magic_"
	var accumulate = new Object()
	var element, key, count, tableKey
	
	for ( element of entries ) {
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
	var keys = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
	var prefix = "magic_"
	var accumulate = new Object()
	var points, entry, die
	
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

function treasureColeItems(entry, quantity, singlePointsTotal) {
	var pointsArray = []
	var pointsLimit = 24
	var pointsDie = 6
	var index, points
	
	singlePointsTotal = singlePointsTotal || singlePointsTotal === undefined ? true : false
	quantity = quantity > 0 ? quantity : 1
	
	for ( index = 0 ; index < quantity ; ++index ) {
		points = quantity - index
		
		if ( points < 1 || singlePointsTotal ) {
			points = treasureDieRoll(pointsDie, Math.ceil(points * pointsLimit / pointsDie))
			index = quantity
		} else {
			points = treasureDieRoll(pointsDie, Math.ceil(pointsLimit / pointsDie))
		}
		
		pointsArray.push(points)
	}
	
	return treasureItemsUsingPoints(entry, pointsArray, pointsLimit)
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
	var count = list.length
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
			rolls = item.quantity * quantity
			rolls = Math.floor(rolls) + (Math.random() < (rolls - Math.floor(rolls)) ? 1 : 0)
			
			if ( rolls > 0 ) {
				items.push({'table':'magic', 'key':item.magic, 'count':[rolls]})
			}
		}
		
		items.unshift({'table':'hoard', 'key':entry.cr, 'count':hoards * quantity, 'name':entry.name})
		aggregate.push(items.concat(valuables, coins))
	}
	
	aggregate.reverse()
	
	return aggregate.concat.apply([], aggregate)
}

function treasureColeEntry(treasure, entry, quantity, singlePointsTotal) {
	var entries = treasureFrequencyEntries(entry.table, quantity)
	var coins = treasureCoins(treasure, [entry.coins], quantity)
	var valuables = treasureValuables(entries, 1)
	var items = treasureColeItems(entry, quantity, singlePointsTotal)
	
	return items.concat(valuables, coins)
}

function treasureColeHoard(treasure, level, quantity, singlePointsTotal) {
	var entry = treasureEntryForLevel(treasure.hoard, level)
	
	return treasureColeEntry(treasure, entry, quantity || 1, singlePointsTotal)
}

function treasureColeParty(treasure, level, quantity, singlePointsTotal) {
	var aggregate = []
	var hoards = treasurePartyHoardsForLevel(treasure.hoard, level)
	var index, count = hoards.length
	var entry, value, treasures
	
	for ( index = 0 ; index < count ; ++index ) {
		entry = treasure.hoard[index]
		value = hoards[index] * (quantity || 1)
		
		if ( value > 0 ) {
			treasures = treasureColeEntry(treasure, entry, value, singlePointsTotal)
			treasures.unshift({'table':'hoard', 'key':entry.cr, 'count':value, 'name':entry.name})
			aggregate.push(treasures)
		}
	}
	
	aggregate.reverse()
	
	return aggregate.concat.apply([], aggregate)
}

function treasureLookupMagicItemEntry(treasure, lookup, entry, times) {
	var armor = entry.armor || false, armorName
	var weapon = entry.weapon || false, weaponName
	
	if ( armor ) {
		armor = treasureFrequencyPrefix(armor)
		armorName = lookup.armors
		armorName = armorName && armorName[armor]
		armorName = armorName && armorName.name
		armorName = armorName || armor
	}
	
	if ( weapon ) {
		if ( weapon.length > 0 ) {
			weapon = treasureFrequencyPrefix(weapon)
		} else {
			weapon = treasureFrequencyElement(treasure.magic.weapons).weapon
		}
		
		weaponName = lookup.weapons
		weaponName = weaponName && weaponName[weapon]
		weaponName = weaponName && weaponName.name
		weaponName = weaponName || weapon
	}
	
	if ( entry.item === 'armor' && entry.armor && entry.bonus > 0 && !entry.variant ) {
		return {'item':entry.item, 'armor':armor, 'bonus':entry.bonus, 'description':armorName + " +" + entry.bonus}
	}
	
	var item = lookup.items[entry.item], itemName = item.name || entry.item
	var variant = entry.variant || item.variant || false, variantName
	var quantity = item.quantity ? treasureDiceRoll(item.quantity) : 0
	var description = itemName
	
	if ( entry.bonus ) {
		description += (entry.bonus < 0 ? " " : " +") + entry.bonus
	}
	
	if ( quantity > 0 ) {
		if ( variant && Array.isArray(variant) ) {
			var variants = []
			
			while ( quantity --> 0 ) {
				variants.push(treasureFrequencyPrefix(variant))
			}
			
			variant = variants
			variants = treasureCoalesceArrayElements(variants, times)
			description += " (" + variants.join(", ") + ")"
		} else if ( item.unit ) {
			description += " (" + quantity + " " + item.unit + ")"
		} else {
			description += times + quantity
		}
	} else {
		if ( variant ) {
			variant = treasureFrequencyPrefix(variant)
			description += " (" + variant + ")"
		}
	}
	
	if ( armor ) { description += ", " + armorName }
	if ( weapon ) { description += ", " + weaponName }
	
	return {'item':entry.item, 'armor':armor, 'weapon':weapon, 'variant':variant, 'quantity':quantity, 'bonus':entry.bonus, 'description':description}
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
	
	var times = options.times || arguments.callee.times || " x "
	var forceMagicItemTable = options.forceMagicItemTable || arguments.callee.forceMagicItemTable || false
	var excludeMagicItemTable = options.excludeMagicItemTable || arguments.callee.excludeMagicItemTable || false
	
	for ( entry of tableKeyCounts ) {
		if ( entry.table === 'hoard' ) {
			entry.descriptions = [entry.count + times + entry.name]
		}
		
		if ( entry.table === 'coins' ) {
			count = entry.count.reduce((s, v) => s + v, 0)
			entry.descriptions = [count + entry.key]
			entry.pounds = count / 50
		}
		
		if ( entry.table === 'gem' || entry.table === 'art' ) {
			entry.names = []
			entry.descriptions = []
			
			for ( count of entry.count ) {
				name = treasureFrequencyElement(treasure[entry.table][entry.key])
				prefix = count + times + entry.key + "gp "
				
				entry.names.push(name)
				entry.descriptions.push(prefix + name)
			}
		}
		
		if ( entry.table === 'magic' ) {
			entry.items = []
			entry.descriptions = []
			
			for ( count of entry.count ) {
				while ( count --> 0 ) {
					key = forceMagicItemTable || entry.key
					prefix = excludeMagicItemTable ? "" : key.toUpperCase() + ": "
					item = treasureLookupMagicItemKey(treasure, lookup, key, times)
					
					if ( item ) {
						entry.items.push(item)
						entry.descriptions.push(prefix + item.description)
					}
				}
			}
			
			entry.descriptions = treasureCoalesceArrayElements(entry.descriptions, times)
		}
	}
}

function treasureValueSummary(gp, pounds, minimumPoundsToDisplayWeight) {
	if ( pounds > minimumPoundsToDisplayWeight ) {
		var weighs = pounds > 4000 ? (pounds / 20).toFixed(2) + " tons" : Math.floor(pounds) + "lb"
		
		return "(Total " + gp + "gp, Weighs " + weighs + ")"
	} else {
		return "(Total " + gp + "gp)"
	}
}

function treasureDescriptions(tableKeyCounts, minimumPoundsToDisplayWeight) {
	var descriptions = []
	var entry
	var index, count, sum = 0, pounds = 0
	
	for ( entry of tableKeyCounts ) {
		if ( entry.descriptions ) {
			if ( entry.summarize && (sum > 0 || pounds > 0) ) {
				descriptions.push(treasureValueSummary(sum / 100, pounds, minimumPoundsToDisplayWeight))
				sum = 0
				pounds = 0
			}
			
			descriptions.push.apply(descriptions, entry.descriptions)
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

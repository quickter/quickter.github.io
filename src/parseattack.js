function parseAttackParametersDamageType(string, result, key, damageTypeMap) {
	if ( !result[key] ) { result[key] = new Object() }
	
	var once = string.slice(-1) === 'o'
	var type = string.slice(1, once ? -1 : undefined)
	var value = once ? 'once' : true
	var index, letter, name = damageTypeMap[type]
	
	if ( name ) {
		result[key][name] = value
	} else if ( Object.values(damageTypeMap).indexOf(type) < 0 ) {
		for ( index = 0 ; index < type.length ; ++index ) {
			letter = type.charAt(index)
			result[key][damageTypeMap[letter] || letter] = value
		}
	} else {
		result[key][type] = value
	}
}

function parseAttackParametersElement(string, damageTypeMap) {
	var result = new Object()
	
	string = string.toLowerCase()
	string = string.replace(/[,•]+/g, " ")
	string = string.replace(/\s+/g, " ")
	string = string.replace(/[‒–—‐‑‧⁃]+/g, "-")
	
	result.armorClass = 10
	result.hit = []
	result.damage = []
	result.defense = []
	result.reduction = []
	result.magical = false
	
	var match, index, found, value, roll, once, type, matched, length, item
	
	index = string.indexOf(':')
	
	if ( index >= 0 ) {
		result.name = string.slice(0, index)
		string = string.slice(index + 1)
	}
	
	var beginHit = 0
	var beginDamage = string.indexOf('/', beginHit)
	var beginAttacks = string.indexOf('#', beginDamage)
	var beginDefense = string.indexOf('@', beginAttacks < 0 ? beginDamage : beginAttacks)
	var closeAttacks = beginDefense < 0 ? string.length : beginDefense
	var closeDamage = beginAttacks < 0 ? closeAttacks : beginAttacks
	var closeHit = beginDamage < 0 ? closeDamage : beginDamage
	
	var stringDefense = beginDefense < 0 ? '10' : string.slice(beginDefense + 1)
	var stringAttacks = beginAttacks < 0 ? '' : string.slice(beginAttacks + 1, closeAttacks)
	var stringDamage = beginDamage < 0 ? '' : string.slice(beginDamage + 1, closeDamage)
	var stringHit = string.slice(beginHit, closeHit)
	
	result.input = [stringHit, stringDamage, stringAttacks, stringDefense]
	result.isAttack = closeHit > beginHit
	result.isDefenseKnown = beginDefense > 0
	
	var patternHit = /([-+]\d*d?\d+[o]?|a[o]?|d[ohz]?|r\d+|i[-+=]\d+|i[ad]|c\d+|rm|m)/g
	var matchHit = stringHit.split(patternHit)
	
	for ( index = 0 ; index < matchHit.length ; ++index ) {
		match = matchHit[index]
		
		if ( !( index & 1 ) ) {
			if ( match.trim() ) { break } else { continue }
		}
		
		if ( match === 'm' ) {
			result.magical = true
		} else if ( match === 'a' ) {
			if ( result.advantageHit !== 'zero' ) { result.advantageHit = true }
		} else if ( match === 'ao' ) {
			if ( !result.advantageHit ) { result.advantageHit = 'once' }
		} else if ( match === 'rm' ) {
			result.advantageMiss = 1
		} else if ( match === 'd' ) {
			if ( result.hit.length > 0 ) { break } // unqualified die
			if ( result.disadvantageHit !== 'zero' ) { result.disadvantageHit = true }
		} else if ( match === 'do' ) {
			if ( !result.disadvantageHit ) { result.disadvantageHit = 'once' }
		} else if ( match === 'dh' ) {
			if ( !result.disadvantageHit || result.disadvantageHit === 'once' ) { result.disadvantageHit = 'hit' }
		} else if ( match === 'dz' ) {
			result.disadvantageHit = 'zero'
		} else if ( match === 'ia' ) {
			result.advantageInitiative = true
		} else if ( match === 'id' ) {
			result.disadvantageInitiative = true
		} else if ( match.charAt(0) === 'i' ) {
			if ( match.charAt(1) === '=' ) {
				result.initiative = match.slice(1) | 0
			} else {
				result.initiativeModifier = (result.initiativeModifier | 0) + (match.slice(1) | 0)
			}
		} else if ( match.charAt(0) === 'c' ) {
			result.criticalRoll = match.slice(1) | 0
		} else if ( match.charAt(0) === 'r' ) {
			value = match.slice(1) | 0
			result.lowAttackReroll = value
		} else {
			found = match.indexOf('o')
			
			if ( !( found < 0 ) ) {
				once = true
				match = match.slice(0, found)
			}
			
			found = match.indexOf('d')
			
			if ( found < 0 ) {
				roll = false
				value = match | 0
			} else {
				roll = match.slice(0, found) | 0
				value = match.slice(found + 1) | 0
				if ( !roll ) { roll = match.charAt(0) === '-' ? -1 : 1 }
			}
			
			item = roll ? {'die':value, 'roll':roll} : {'modifier':value}
			if ( once ) { item.once = true }
			if ( value ) { result.hit.push(item) }
		}
	}
	
	var patternDiceModifierText = /([-+]?\d*)(d?)(\d+)([a-z]*)/
	var patternDamage = /([-+]?\d*d?\d+[a-z]*|[+]c?\d+d?|\b[mr]\d+|\bao?)/g
	var matchDamage = stringDamage.split(patternDamage)
	
	for ( index = 0 ; index < matchDamage.length ; ++index ) {
		match = matchDamage[index]
		
		if ( !( index & 1 ) ) {
			if ( match.trim() ) { break } else { continue }
		}
		
		if ( match === 'a' ) {
			result.advantageDamage = true
		} else if ( match === 'ao' ) {
			if ( !result.advantageDamage ) { result.advantageDamage = 'once' }
		} else if ( match.charAt(0) === 'm' ) {
			value = match.slice(1) | 0
			if ( value > 0 ) {
				if ( result.damage.length > 0 ) {
					result.damage[result.damage.length - 1].minimum = value
				} else {
					result.minimumDamageRoll = value
				}
			}
		} else if ( match.charAt(0) === 'r' ) {
			value = match.slice(1) | 0
			if ( value > 0 ) {
				if ( result.damage.length > 0 ) {
					result.damage[result.damage.length - 1].reroll = value
				} else {
					result.lowDamageReroll = value
				}
			}
		} else if ( match.slice(0, 2) === '+c' ) {
			found = match.indexOf('d')
			if ( found < 0 ) {
				value = match.slice(2) | 0
				result.criticalDamage = (value | 0) + (result.criticalDamage | 0)
			} else {
				value = match.slice(2, found) | 0
				result.criticalDice = (value | 0) + (result.criticalDice | 0)
			}
		} else {
			matched = match.match(patternDiceModifierText)
			type = matched[4]
			once = type.slice(-1) === 'o'
			
			if ( matched[2] === 'd' ) {
				roll = matched[1] | 0
				value = matched[3] | 0
				if ( !roll ) { roll = matched[1].charAt(0) === '-' ? -1 : 1 }
			} else {
				roll = false
				value = (matched[1] + matched[3]) | 0
			}
			
			item = roll ? {'die':value, 'roll':roll} : {'modifier':value}
			
			if ( once ) {
				item.once = true
				type = type.slice(0, -1)
			}
			
			if ( type ) {
				item.type = damageTypeMap[type] || type
				length = result.damage.length
				
				if ( length > 0 && !roll && result.damage[length - 1].roll && !result.damage[length - 1].type ) {
					result.damage[length - 1].type = item.type
				}
			}
			
			result.damage.push(item)
		}
	}
	
	var patternAttacks = /(\d+|cb|b|r)/g
	var matchAttacks = stringAttacks.split(patternAttacks)
	
	for ( index = 0 ; index < matchAttacks.length ; ++index ) {
		match = matchAttacks[index]
		
		if ( !( index & 1 ) ) {
			if ( match.trim() ) { break } else { continue }
		}
		
		if ( match === 'cb' ) {
			result.criticalBonusAttack = true
		} else if ( match === 'b' ) {
			result.bonusAction = true
		} else if ( match === 'r' ) {
			result.reaction = true
		} else {
			value = match | 0
			if ( value > 0 ) { result.attacks = value }
		}
	}
	
	var patternDefense = /(\d+|[-+]\d*d?\d+[mo]?|hp\s*\d+|[vr][a-z]*|i[a-z]+|d[oh]?|a[oz]?)/g
	var matchDefense = stringDefense.split(patternDefense)
	
	for ( index = 0 ; index < matchDefense.length ; ++index ) {
		match = matchDefense[index]
		
		if ( !( index & 1 ) ) {
			if ( match.trim() ) { break } else { continue }
		}
		
		if ( match === 'a' ) {
			if ( result.advantageHit !== 'zero' ) { result.advantageHit = true }
		} else if ( match === 'ao' ) {
			if ( !result.advantageHit ) { result.advantageHit = 'once' }
		} else if ( match === 'az' ) {
			result.advantageHit = 'zero'
		} else if ( match === 'd' ) {
			if ( result.disadvantageHit !== 'zero' ) { result.disadvantageHit = true }
		} else if ( match === 'do' ) {
			if ( !result.disadvantageHit ) { result.disadvantageHit = 'once' }
		} else if ( match === 'dh' ) {
			if ( !result.disadvantageHit || result.disadvantageHit === 'once' ) { result.disadvantageHit = 'hit' }
		} else if ( match.slice(0, 2) === 'hp' ) {
			result.hitpoints = +match.slice(2)
		} else if ( match.charAt(0) === '+' ) {
			matched = match.match(patternDiceModifierText)
			
			if ( matched[2] === 'd' ) {
				roll = matched[1] | 0
				value = matched[3] | 0
				if ( !roll ) { roll = 1 }
			} else {
				roll = false
				value = (matched[1] + matched[3]) | 0
			}
			
			item = roll ? {'die':value, 'roll':roll} : {'modifier':value}
			
			if ( matched[4] === 'o' ) { item.once = true }
			if ( matched[4] === 'm' ) { item.afterFirst = true }
			
			result.defense.push(item)
		} else if ( match.charAt(0) === '-' ) {
			matched = match.match(patternDiceModifierText)
			
			if ( matched[2] === 'd' ) {
				roll = -matched[1] | 0
				value = matched[3] | 0
				if ( !roll ) { roll = 1 }
			} else {
				roll = 0
				value = -(matched[1] + matched[3]) | 0
			}
			
			item = roll ? {'die':value, 'roll':roll} : {'modifier':value}
			
			if ( matched[4] === 'o' ) { item.once = true }
			
			result.reduction.push(item)
		} else if ( match.charAt(0) === 'v' ) {
			parseEffectivenessDamageType(match, result, 'vulnerable', damageTypeMap)
		} else if ( match.charAt(0) === 'r' ) {
			parseEffectivenessDamageType(match, result, 'resistant', damageTypeMap)
		} else if ( match.charAt(0) === 'i' ) {
			parseEffectivenessDamageType(match, result, 'immune', damageTypeMap)
		} else {
			value = match | 0
			if ( value >= 0 ) { result.armorClass = value }
		}
	}
	
	if ( result.advantageHit = 'zero' ) {
		result.advantageHit = false
	}
	
	if ( result.disadvantageHit = 'zero' ) {
		result.disadvantageHit = false
	}
	
	if ( !result.attacks ) {
		result.attacks = result.bonusAction || result.reaction ? 0 : 1
	}
	
	return result
}

function parseAttackParameters(string, damageTypeMap) {
	var parts = string.split(';')
	var index, count = parts.length
	
	// use defense from last part as default defense for all parts
	if ( count > 1 ) {
		var defense = parts[count - 1].indexOf('@')
		
		if ( defense >= 0 ) {
			var suffix = parts[count - 1].slice(defense)
			
			for ( index = 0 ; index < count - 1 ; ++index ) {
				if ( parts[index].length > 0 && parts[index].indexOf('@') < 0 ) {
					parts[index] += suffix
				}
			}
		}
	}
	
	return parts.map(s => parseAttackParametersElement(s, damageTypeMap))
}

function parseAttackParametersRudimentaryDuel(a, b, damageTypeMap) {
	if ( b.length > 0 && b.indexOf('@') < 0 ) {
		var index = a.indexOf(b)
		
		if ( index > 0 ) {
			b = a.slice(index + b.length)
			a = a.slice(0, index)
		}
	}
	
	var ap = a.split('@')
	var bp = b.split('@')
	if ( ap.length != 2 || bp.length != 2 ) { return false }
	
	var ae = parseAttackParameters(ap[0] + '@' + bp[1], damageTypeMap)
	var be = parseAttackParameters(bp[0] + '@' + ap[1], damageTypeMap)
	if ( !ae.length || !be.length ) { return false }
	
	var ahp = be[0].hitpoints | 0
	var bhp = ae[0].hitpoints | 0
	if ( !ahp || !bhp ) { return false }
	
	return {'a':ae, 'b':be, 'ahp':ahp, 'bhp':bhp, 'aname':ae[0].name, 'bname':be[0].name}
}

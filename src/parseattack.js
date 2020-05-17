'use strict';

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
			parseAttackParametersDamageType(match, result, 'vulnerable', damageTypeMap)
		} else if ( match.charAt(0) === 'r' ) {
			parseAttackParametersDamageType(match, result, 'resistant', damageTypeMap)
		} else if ( match.charAt(0) === 'i' ) {
			parseAttackParametersDamageType(match, result, 'immune', damageTypeMap)
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
	
	return parts.map(function parse(s) { return parseAttackParametersElement(s, damageTypeMap) })
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

////////////////////////////////////////////////////////////////////////////////

function evaluateRandomInteger(count) {
	if ( crypto && crypto.getRandomValues ) {
		var randomValues = new Uint32Array(1)
		
		crypto.getRandomValues(randomValues)
		
		return randomValues[0] % count
	} else {
		return Math.floor(Math.random() * Math.floor(count)) | 0
	}
}

function evaluateDieRoll(die, rolls, chronicle, prefix, reroll, minimum) {
	var sum = 0
	var value, other, each = []
	var negative = rolls < 0
	
	if ( reroll < 1 || reroll > die ) { reroll = 0 }
	if ( minimum < 2 || minimum > die ) { minimum = 0 }
	
	rolls = negative ? -rolls : +rolls || 1
	value = (negative ? "-" : "") + rolls + "d" + die
	prefix = prefix ? prefix + " " + value : value
	
	while ( rolls --> 0 ) {
		value = 1 + evaluateRandomInteger(die)
		
		if ( reroll >= value && !negative ) {
			other = 1 + evaluateRandomInteger(die)
			each.push(value + " ~ " + other)
			value = other
		} else if ( minimum > value && !negative ) {
			each.push(value + " < " + minimum)
			value = minimum
		} else {
			each.push(value)
		}
		
		sum += value
	}
	
	chronicle.push(prefix + " (" + each.join(", ") + ")")
	return sum
}

function evaluateOnce(object) {
	return object.once
}

function evaluateSumDieRoll(sum, roll) {
	return sum + (roll.modifier | 0) + (roll.die | 0) * (roll.roll || 1)
}

function evaluateSingleInitiative(e) {
	if ( e.initiative > 0 ) {
		return e.initiative
	}
	
	var initiative = 1 + evaluateRandomInteger(20)
	var advantage = e.advantageInitiative || false
	var disadvantage = e.disadvantageInitiative || false
	
	if ( advantage && !disadvantage ) {
		initiative = Math.max(1 + evaluateRandomInteger(20), initiative)
	}
	
	if ( !advantage && disadvantage ) {
		initiative = Math.min(1 + evaluateRandomInteger(20), initiative)
	}
	
	return initiative + (e.initiativeModifier | 0)
}

function evaluateSingleEffectiveness(e, context, verbose) {
	context = context || {}
	context.chronicle = context.chronicle || []
	context.concise = context.concise || []
	context.summary = context.summary || []
	context.hits = context.hits || 0
	context.misses = context.misses || 0
	context.attacks = context.attacks || 0
	context.damage = context.damage || false
	context.damageRolled = context.damageRolled || 0
	context.bonusActionUsed = context.bonusActionUsed || false
	
	var summary = context.summary
	var concise = context.concise
	var chronicle = context.chronicle
	var summarize, result = ""
	
	var isAttack = e.isAttack
	var isDefenseKnown = e.isDefenseKnown
	var isHit
	var advantageHit = e.advantageHit
	var disadvantageHit = e.disadvantageHit
	var advantageDamage = e.advantageDamage
	var advantageMiss = e.advantageMiss
	var attack, attacks = Math.max(+e.attacks, 1)
	var index, item, once
	var modifierHit, armorClass, hit
	var hasAdvantage, hasDisadvantage, toHit
	var damageRolled, damageAdvantageRolled, damageModifier
	var damageDice, damageDiceLength, damageScalars
	var isCritical, dieForCritical, damageScalarForCritical
	var damageScalar, immune, resistant, vulnerable
	var type, previousType = ""
	
	var useOnceToHit, useOnceDamage
	var onceToHit = e.hit.filter(evaluateOnce)
	var onceToDefend = e.defense.filter(evaluateOnce)
	
	var mundane = ['bludgeoning', 'piercing', 'slashing']
	var immuneAll = (e.immune && e.immune['all']) || false
	var resistantAll = (e.resistant && e.resistant['all']) || false
	var vulnerableAll = (e.vulnerable && e.vulnerable['all']) || false
	
	immuneAll = immuneAll ? immuneAll !== 'once' ? 2 : 1 : 0
	resistantAll = resistantAll ? resistantAll !== 'once' ? 2 : 1 : 0
	vulnerableAll = vulnerableAll ? vulnerableAll !== 'once' ? 2 : 1 : 0
	
	if ( e.bonusAction && attacks > 0 ) {
		if ( context.bonusActionUsed ) {
			attacks = 0
		} else {
			context.bonusActionUsed = true
		}
	}
	
	if ( advantageHit === 'once' && context.attacks > 0 ) { advantageHit = false }
	if ( disadvantageHit === 'once' && context.attacks > 0 ) { disadvantageHit = false }
	if ( disadvantageHit === 'hit' && context.hits > 0 ) { disadvantageHit = false }
	if ( advantageMiss === 'once' && context.misses > 0 ) { advantageMiss = false }
	
	for ( attack = 0 ; attack < attacks ; ++attack ) {
		chronicle.push("#" + (context.attacks + 1))
		
		summarize = new Object()
		result = ""
		isHit = false
		hasAdvantage = false
		hasDisadvantage = false
		useOnceToHit = 0
		modifierHit = 0
		armorClass = e.armorClass || 10
		
		if ( isAttack ) {
			toHit = evaluateDieRoll(20, 1, chronicle, "roll hit", e.lowAttackReroll)
			
			if ( disadvantageHit ) {
				if ( disadvantageHit === 'once' ) { disadvantageHit = 0 }
				if ( !advantageHit ) { hasDisadvantage = true; toHit = Math.min(evaluateDieRoll(20, 1, chronicle, "roll disadvantage", e.lowAttackReroll), toHit) }
			}
			
			if ( advantageHit ) {
				if ( advantageHit === 'once' ) { advantageHit = 0 }
				if ( !hasDisadvantage ) { hasAdvantage = true; toHit = Math.max(evaluateDieRoll(20, 1, chronicle, "roll advantage", e.lowAttackReroll), toHit) }
			}
		}
		
		if ( isAttack && toHit > 1 ) {
			for ( index = 0 ; index < e.hit.length ; ++index ) {
				item = e.hit[index]
				
				if ( !item.once ) {
					if ( item.modifier ) { modifierHit += item.modifier }
					if ( item.die ) { modifierHit += evaluateDieRoll(item.die, item.roll, chronicle, "roll modifier") }
				}
			}
		}
		
		if ( isAttack && isDefenseKnown && toHit > 1 ) {
			for ( index = 0 ; index < e.defense.length ; ++index ) {
				item = e.defense[index]
				
				if ( !item.once ) {
					if ( item.modifier ) { armorClass += item.modifier }
					if ( item.die ) { armorClass += evaluateDieRoll(item.die, item.roll, chronicle, "roll defense") }
				}
			}
		}
		
		if ( isAttack && isDefenseKnown && toHit > 1 && toHit < 20 ) {
			hit = toHit + modifierHit - armorClass
			
			while ( onceToHit.length > 0 || onceToDefend.length > 0 ) {
				if ( toHit + modifierHit < armorClass ) {
					once = onceToHit.reduce(evaluateSumDieRoll, 0) * 0.5
					
					if ( toHit + modifierHit + once >= armorClass ) {
						item = onceToHit.shift()
						useOnceToHit += 1
						
						if ( item.modifier ) { modifierHit += item.modifier; chronicle.push("once modifier " + item.modifier) }
						if ( item.die ) { modifierHit += evaluateDieRoll(item.die, item.roll, chronicle, "once modifier") }
					} else {
						break
					}
				} else {
					once = onceToDefend.reduce(evaluateSumDieRoll, 0) * 0.5
					
					if ( toHit + modifierHit < armorClass + once ) {
						item = onceToDefend.shift()
						
						if ( item.modifier ) { armorClass += item.modifier; chronicle.push("once defense " + item.modifier) }
						if ( item.die ) { armorClass += evaluateDieRoll(item.die, item.roll, chronicle, "once defense") }
					} else {
						break
					}
				}
				
				hit = toHit + modifierHit - armorClass
			}
		}
		
		if ( isAttack ) {
			if ( toHit <= 1 ) {
				isHit = false
				result = "-"
				chronicle.push("miss (natural 1)")
			} else if ( toHit >= 20 ) {
				isHit = true
				result = "+"
				chronicle.push("hit (natural 20)")
			} else if ( !isDefenseKnown ) {
				isHit = null
				result = "AC " + (toHit + modifierHit)
				chronicle.push("can hit AC " + (toHit + modifierHit))
			} else if ( toHit + modifierHit < armorClass ) {
				isHit = false
				result = "-" + (armorClass - modifierHit - toHit)
				chronicle.push("miss AC " + armorClass + " by " + (armorClass - modifierHit - toHit))
			} else {
				isHit = true
				result = "+" + (toHit + modifierHit - armorClass)
				chronicle.push("hit AC " + armorClass + " by " + (toHit + modifierHit - armorClass))
			}
			
			summarize.toHit = toHit
			summarize.bonusToHit = modifierHit
			summarize.hit = toHit > 1 ? toHit < 20 ? toHit + modifierHit : true : false
			summarize.armorClass = isDefenseKnown ? armorClass : null
			summarize.isHit = isDefenseKnown ? isHit : null
			summarize.once = useOnceToHit || 0
			
			for ( index = 0 ; index < useOnceToHit ; ++index ) { result += "•" }
			result += "/"
		} else {
			summarize.toHit = false
		}
		
		if ( isAttack && isDefenseKnown && isHit && disadvantageHit === 'hit' ) {
			disadvantageHit = 0
		}
		
		if ( isAttack && isDefenseKnown && !isHit && advantageMiss ) {
			context.misses += 1
			attacks += 1
			advantageMiss = 0
			chronicle.push("retry miss")
			concise.push(result + "#")
			summarize.retry = 1
			continue
		}
		
		damageRolled = 0
		damageAdvantageRolled = 0
		damageModifier = 0
		dieForCritical = 0
		damageScalarForCritical = 1
		damageDice = []
		damageScalars = []
		useOnceDamage = 0
		previousType = "any"
		
		for ( index = 0 ; index < e.damage.length ; ++index ) {
			item = e.damage[index]
			type = item.type || previousType
			previousType = type
			damageScalar = 1
			
			immune = type && e.immune && !(e.magical && mundane.indexOf(type) >= 0) && e.immune[type]
			resistant = type && e.resistant && !(e.magical && mundane.indexOf(type) >= 0) && e.resistant[type]
			vulnerable = type && e.vulnerable && e.vulnerable[type]
			
			immune = (immune ? immune !== 'once' ? 2 : 1 : 0) | immuneAll
			resistant = (resistant ? resistant !== 'once' ? 2 : 1 : 0) | resistantAll
			vulnerable = (vulnerable ? vulnerable !== 'once' ? 2 : 1 : 0) | vulnerableAll
			
			if ( immune && !(context.hits && immune === 1) ) { chronicle.push("immune " + type); continue }
			if ( resistant && !(context.hits && resistant === 1) ) { damageScalar = 0.5 }
			if ( vulnerable && !(context.hits && vulnerable === 1) ) { damageScalar *= 2.0 }
			
			if ( !item.once || (isHit && !context.hits) ) {
				if ( item.once ) { useOnceDamage += 1 }
				if ( item.die > 0 ) { item.type = type; damageDice.push(item); damageScalars.push(damageScalar) }
				if ( item.die * damageScalar > dieForCritical * damageScalarForCritical ) { dieForCritical = item.die; damageScalarForCritical = damageScalar }
				if ( item.modifier ) { damageModifier += item.modifier * damageScalar; chronicle.push(type + " damage " + item.modifier) }
			}
		}
		
		isCritical = isAttack && !(toHit < (e.criticalRoll || 20))
		damageDiceLength = damageDice.length
		
		if ( isCritical ) {
			chronicle.push("critical")
			damageDice = damageDice.concat(damageDice)
			damageScalars = damageScalars.concat(damageScalars)
			if ( e.criticalDamage ) { damageModifier += e.criticalDamage; chronicle.push("damage " + e.criticalDamage) }
			if ( e.criticalDice > 0 && dieForCritical ) { damageDice.push({'die':dieForCritical, 'roll':e.criticalDice}); damageScalars.push(damageScalarForCritical); chronicle.push("dice " + (e.criticalDice || 1) + "d" + dieForCritical) }
			if ( e.criticalBonusAttack && !context.bonusActionUsed ) { context.bonusActionUsed = true; attacks += 1; chronicle.push("bonus attack") }
		}
		
		for ( index = 0 ; index < damageDice.length ; ++index ) {
			item = damageDice[index]
			if ( item.roll < 0 && !(index < damageDiceLength) ) { continue }
			damageRolled += evaluateDieRoll(item.die, item.roll, chronicle, item.type + " damage", item.reroll, item.minimum) * damageScalars[index]
		}
		
		if ( advantageDamage ) {
			for ( index = 0 ; index < damageDice.length ; ++index ) {
				item = damageDice[index]
				if ( item.roll < 0 && !(index < damageDiceLength) ) { continue }
				damageAdvantageRolled += evaluateDieRoll(item.die, item.roll, chronicle, item.type + " advantage", item.reroll, item.minimum) * damageScalars[index]
			}
			
			damageRolled = Math.max(damageRolled, damageAdvantageRolled)
			if ( advantageDamage === 'once' ) { advantageDamage = 0 }
		}
		
		for ( index = 0 ; index < e.reduction.length ; ++index ) {
			item = e.reduction[index]
			
			if ( !item.once || (isHit && !context.hits) ) {
				if ( item.die ) { damageModifier -= evaluateDieRoll(item.die, item.roll, chronicle, "reduce") }
				if ( item.modifier ) { damageModifier -= item.modifier; chronicle.push("reduce " + item.modifier) }
			}
		}
		
		chronicle.push("sum " + (damageRolled + damageModifier))
		
		damageRolled = Math.max(0, Math.round(damageRolled + damageModifier))
		result += damageRolled
		
		summarize.damageDone = isDefenseKnown && isHit ? damageRolled : false
		summarize.damage = damageRolled
		summarize.critical = isCritical
		
		if ( isHit ) {
			context.hits += 1
		} else if ( isDefenseKnown ) {
			context.misses += 1
		}
		
		context.attacks += 1
		
		if ( isDefenseKnown ) {
			context.damage += isHit ? damageRolled : 0
		}
		
		if ( isHit || !isAttack ) {
			context.damageRolled += damageRolled
		}
		
		concise.push(result)
		summary.push(summarize)
	}
	
	if ( verbose ) {
		console.log(chronicle.join(" "))
	}
	
	return context
}

function evaluateEffectiveness(parsed, verbose) {
	var result = false
	var single
	
	for ( single of parsed ) {
		result = evaluateSingleEffectiveness(single, result, verbose)
	}
	
	return result
}

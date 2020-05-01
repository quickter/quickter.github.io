'use strict';

// var encounter = {
// 	"experienceForChallengeRating":[
// 		10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900,
// 		7200, 8400, 10000, 11500, 13000, 15000, 18000, 20000, 22000, 25000,
// 		33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000
// 	],
// 	"difficulties":["easy", "medium", "hard", "deadly", "day"],
// 	"easy":   [0,  25,  50,   75,  125,  250,  300,  350,  450,  550,  600,   800,  1000,  1100,  1250,  1400,  1600,  2000,  2100,  2400,  2800],
// 	"medium": [0,  50, 100,  150,  250,  500,  600,  750,  900, 1100, 1200,  1600,  2000,  2200,  2500,  2800,  3200,  3900,  4200,  4900,  5700],
// 	"hard":   [0,  75, 150,  225,  375,  750,  900, 1100, 1400, 1600, 1900,  2400,  3000,  3400,  3800,  4300,  4800,  5900,  6300,  7300,  8500],
// 	"deadly": [0, 100, 200,  400,  500, 1100, 1400, 1700, 2100, 2400, 2800,  3600,  4500,  5100,  5700,  6400,  7200,  8800,  9500, 10900, 12700],
// 	"day":    [0, 300, 600, 1200, 1700, 3500, 4000, 5000, 6000, 7500, 9000, 10500, 11500, 13500, 15000, 18000, 20000, 25000, 27000, 30000, 40000],
// 	"multiplier":[{"m":0.5}, {"n":1, "m":1}, {"n":2, "m":1.5}, {"n":6, "m":2}, {"n":10, "m":2.5}, {"n":14, "m":3}, {"n":20, "m":4}, {"m":5}],
// }

function encounterRandomInteger(count) {
	if ( crypto && crypto.getRandomValues ) {
		var randomValues = new Uint32Array(1)
		
		crypto.getRandomValues(randomValues)
		
		return randomValues[0] % count
	} else {
		return Math.floor(Math.random() * Math.floor(count)) | 0
	}
}

function encounterRandomElement(array) {
	var count = array.length
	
	return array[count > 1 ? encounterRandomInteger(count) : 0]
}

function encounterRandomElements(array, count) {
	var result = []
	
	array = result.concat(array)
	if ( count < 0 ) { count += array.length }
	if ( count > array.length ) { count = array.length }
	
	while ( count --> 0 ) {
		result.push.apply(result, array.splice(encounterRandomInteger(array.length), 1))
	}
	
	return result
}

function encounterBinarySearch(array, value, compare) {
	var m = 0, n = (array && array.length) - 1, o = -1
	
	if ( 'function' === typeof compare ) {
		while ( m <= n ) {
			o = (m + n) >> 1
			if ( compare(value, array[o]) > 0 ) { m = o + 1 }
			else { n = o - 1 }
		}
		
		if ( o < 0 || compare(value, array[m > o ? m : o]) < 0 ) { m = -1 - m }
	} else {
		while ( m <= n ) {
			o = (m + n) >> 1
			if ( value > array[o] ) { m = o + 1 }
			else { n = o - 1 }
		}
		
		if ( o < 0 || value < array[m > o ? m : o] ) { m = -1 - m }
	}
	
	return m
}

function encounterMultipliers(encounter, characterLevels, maximumCreatures) {
	var offset, number, multiplier, multipliers = []
	var index, count, maximum, minimum = 1
	
	if ( characterLevels.length < 3 ) {
		offset = 1
	} else if ( characterLevels.length > 5 ) {
		offset = -1
	} else {
		offset = 0
	}
	
	for ( index = 1, count = encounter.multiplier.length - 1 ; index < count ; ++index ) {
		multiplier = encounter.multiplier[index + offset].m
		maximum = encounter.multiplier[index].n
		
		if ( maximumCreatures > 0 ) {
			if ( minimum > maximumCreatures ) {
				break
			} else if ( maximum > maximumCreatures || index + 1 === count ) {
				maximum = maximumCreatures
			}
		}
		
		multipliers.push({'minimum':minimum, 'maximum':maximum, 'multiplier':multiplier})
		
		minimum = maximum + 1
	}
	
	return multipliers
}

function encounterExperiencePerDifficulty(encounter, characterLevels) {
	var difficulties = encounter.difficulties
	var experiencePerLevel
	var level, sum, experience = []
	var index, count
	
	for ( index = 0, count = difficulties.length ; index < count ; ++index ) {
		experiencePerLevel = encounter[difficulties[index]]
		sum = 0
		
		for ( level of characterLevels ) {
			sum += experiencePerLevel[level | 0] || 0
		}
		
		experience[index] = sum
	}
	
	return experience
}

function encounterExperienceSum(encounter, challenges) {
	var sum = 0
	var challenge
	var experienceForChallengeRating = encounter.experienceForChallengeRating
	
	for ( challenge of challenges ) {
		if ( challenge > 0 && challenge < 1 ) {
			sum += experienceForChallengeRating[1] * challenge
		} else {
			sum += experienceForChallengeRating[challenge] || 0
		}
	}
	
	return sum
}

function encounterChallengeSearch(experienceForChallengeRating, experience, rounding) {
	var base = experienceForChallengeRating[1]
	var array = [].concat(experienceForChallengeRating)
	
	array.splice(1, 0, base * 0.125, base * 0.25, base * 0.5)
	
	var challenge = encounterBinarySearch(array, experience)
	var value, ratio
	
	if ( challenge < 0 ) {
		challenge = -2 - challenge
		
		if ( challenge < 0 ) {
			challenge = 0
		} else if ( challenge + 1 < array.length ) {
			if ( rounding > 0 && rounding < 1 ) {
				value = array[challenge]
				ratio = (experience - value) / (array[challenge + 1] - value)
				
				if ( ratio >= rounding ) {
					challenge += 1
				}
			}
		}
	}
	
	if ( challenge < 4 ) {
		challenge = [0, 0.125, 0.25, 0.5][challenge]
	} else {
		challenge -= 3
	}
	
	return challenge
}

function encounterUniformGroupForExperience(encounter, minimumExperience, minimumCreatures, maximumCreatures) {
	var result = []
	var experienceForChallengeRating = encounter.experienceForChallengeRating
	var challenge, available, index
	
	challenge = encounterChallengeSearch(experienceForChallengeRating, minimumExperience / minimumCreatures, 0.25)
	
	for ( index = 0 ; index < minimumCreatures ; ++index ) {
		result.push(challenge)
	}
	
	return result
}

function encounterLimits(encounter, characterLevels, maximumCreatures) {
	var result = []
	var difficultyCount = 4
	var difficulties = encounter.difficulties
	var experienceForChallengeRating = encounter.experienceForChallengeRating
	var multipliers = encounterMultipliers(encounter, characterLevels, maximumCreatures)
	var experience = encounterExperiencePerDifficulty(encounter, characterLevels)
	var multiplierCount = multipliers.length
	var challengeCount = experienceForChallengeRating.length
	
	var difficultyIndex, multiplierIndex
	var difficulty, multiplier, cost
	var difficultyExperience, difficultyExperienceLimit, limit
	var number, challenge, previous
	
	maximumCreatures = multipliers[multiplierCount - 1].minimum
	
	for ( difficultyIndex = 0 ; difficultyIndex < difficultyCount ; ++difficultyIndex ) {
		difficulty = difficulties[difficultyIndex]
		difficultyExperience = experience[difficultyIndex]
		difficultyExperienceLimit = difficultyIndex + 1 < difficultyCount ? experience[difficultyIndex + 1] : difficultyExperience * 1.5
		
		result.push({
			'difficulty':difficulty,
			'difficultyIndex':difficultyIndex,
			'experience':difficultyExperience,
			'experienceLimit':difficultyExperienceLimit,
			'multipliers':[],
			'experienceForNumber':[null],
			'uniformChallengeRatingForNumber':[null],
			'numberForUniformChallengeRating':[],
		})
		
		for ( multiplier of multipliers ) {
			result[difficultyIndex].multipliers.push({
				'minimum':multiplier.minimum,
				'maximum':multiplier.maximum,
				'multiplier':multiplier.multiplier,
				'experience':Math.round(difficultyExperience / multiplier.multiplier),
				'experienceLimit':Math.round(difficultyExperienceLimit / multiplier.multiplier),
			})
		}
		
		multiplierIndex = 0
		multiplier = multipliers[multiplierIndex]
		
		for ( number = 1 ; number <= maximumCreatures ; ++number ) {
			if ( number > multiplier.maximum ) {
				multiplierIndex += 1
				multiplier = multipliers[multiplierIndex]
			}
			
			limit = difficultyExperience / multiplier.multiplier
			result[difficultyIndex].experienceForNumber[number] = Math.round(limit)
		}
	}
	
	if ( difficultyIndex < difficulties.length ) {
		result.push({
			'difficulty':difficulties[difficultyIndex],
			'difficultyIndex':difficultyIndex,
			'experience':experience[difficultyIndex],
		})
	}
	
	var prefix = [0, 0.125, 0.25, 0.5, 1]
	var index, over = []
	
	for ( index = -3 ; index < challengeCount ; ++index ) {
		challenge = index < 1 ? prefix[index + 3] : index
		cost = (challenge > 0 && challenge < 1) ? experienceForChallengeRating[1] * challenge : experienceForChallengeRating[challenge]
		
		for ( difficultyIndex = difficultyCount ; difficultyIndex --> 0 ; ) {
			if ( over[difficultyIndex] ) {
				continue
			}
			
			difficultyExperience = experience[difficultyIndex]
			
			for ( multiplierIndex = multiplierCount ; multiplierIndex --> 0 ; ) {
				multiplier = multipliers[multiplierIndex]
			
				limit = difficultyExperience / multiplier.multiplier
				number = limit / cost
				
				if ( multiplierIndex > 0 ) {
					number = Math.ceil(number)
					
					if ( number < multiplier.minimum ) {
						continue
					}
					
					if ( number > multiplier.maximum && multiplierIndex + 1 < multiplierCount ) {
						number = multiplier.maximum + 1
					}
				} else {
					if ( number < multiplier.minimum ) {
						over[difficultyIndex] = true
					}
					
					number = Math.ceil(number)
				}
				
				if ( difficultyIndex + 1 < difficultyCount ) {
					if ( number < maximumCreatures && number * cost >= result[difficultyIndex + 1].experienceForNumber[number] ) {
						result[difficultyIndex].numberForUniformChallengeRating[challenge] = null
						over[difficultyIndex] = false
						break
					}
				}
				
				result[difficultyIndex].numberForUniformChallengeRating[challenge] = number
				break
			}
		}
	}
	
	multiplierIndex = 0
	multiplier = multipliers[multiplierIndex]
	
	for ( number = 1 ; number <= maximumCreatures ; ++number ) {
		if ( number > multiplier.maximum ) {
			multiplierIndex += 1
			multiplier = multipliers[multiplierIndex]
		}
		
		difficultyIndex = 3 // deadly
		difficultyExperience = experience[difficultyIndex]
		limit = difficultyExperience / multiplier.multiplier
		challenge = encounterBinarySearch(experienceForChallengeRating, limit / number)
		
		if ( challenge < 0 ) {
			challenge = -1 - challenge
		} else {
			challenge += 1
		}
		
		if ( challenge === 1 ) {
			cost = experienceForChallengeRating[1]
			
			if ( 0.25 * cost * (number - 1) < limit ) {
				challenge = (0.5 * cost * (number - 1) < limit) ? 1 : 0.5
			} else {
				challenge = (0.125 * cost * (number - 1) < limit) ? 0.25 : 0.125
			}
		}
		
		result[difficultyIndex].uniformChallengeRatingForNumber[number] = challenge
		
// 					for ( previous = challenge ; previous > 0 && (result[difficultyIndex].numberForUniformChallengeRating[previous] || 0) < number ; ) {
// 						result[difficultyIndex].numberForUniformChallengeRating[previous] = number
// 						previous = previous > 0.125 ? previous > 1 ? previous - 1 : previous / 2 : 0
// 					}
		
		while ( challenge > 0 && difficultyIndex > 0 ) {
			previous = challenge
			
			if ( challenge > 1 ) {
				challenge -= 1
				cost = experienceForChallengeRating[challenge]
			} else if ( challenge > 0.125 ) {
				challenge /= 2
				cost = experienceForChallengeRating[1] * challenge
			} else {
				challenge = 0
				cost = experienceForChallengeRating[challenge]
			}
			
			if ( cost * number <= limit ) {
				difficultyIndex -= 1
				difficultyExperience = experience[difficultyIndex]
				limit = difficultyExperience / multiplier.multiplier
				
				if ( cost * number < limit && difficultyIndex > 0 ) {
					challenge = previous
					result[difficultyIndex].uniformChallengeRatingForNumber[number] = null
				} else {
					result[difficultyIndex].uniformChallengeRatingForNumber[number] = challenge
					
// 								for ( previous = challenge ; previous > 0 && (result[difficultyIndex].numberForUniformChallengeRating[previous] || 0) < number ; ) {
// 									result[difficultyIndex].numberForUniformChallengeRating[previous] = number
// 									previous = previous > 0.125 ? previous > 1 ? previous - 1 : previous / 2 : 0
// 								}
				}
			}
		}
	}
	
	return result
}

function encounterRandomEnvironment(encounter, environment) {
	if ( Array.isArray(environment) ) {
		environment = encounterRandomElement(environment)
	}
	
	if ( typeof environment === 'string' ) {
		environment = environment.trim()
	}
	
	if ( encounter.list.environments.indexOf(environment) < 0 ) {
		environment = encounterRandomElement(encounter.list.environments)
	}
	
	return environment
}

function encounterRandomCreature(encounter, challenge, environment) {
	var creatureByEnvironment = encounter.creatureBy[environment]
	var creatures = creatureByEnvironment && creatureByEnvironment[challenge]
	var creatureKey = creatures && encounterRandomElement(creatures)
	var creature = creatureKey && encounter.creatureBy.key[creatureKey]
	
	return creature
}

function encounterRandomGroup(encounter, multiplier, environment) {
	var experienceForChallengeRating = encounter.experienceForChallengeRating
	var creatureByKey = encounter.creatureBy.key
	var creatureByEnvironment = encounter.creatureBy[environment]
	var group, groups = creatureByEnvironment && creatureByEnvironment.groups
	var key, experienceKey, creature, challenge, experience
	var parts, candidates, costs, byExperience
	var lowerIndex, upperIndex, lowerCost, upperCost
	var lowerNumber, upperNumber, lowerMinimum, lowerMaximum
	var lowerCreature, upperCreature, environments
	var pairs, previous
	
	if ( !groups || multiplier.maximum < 2 || multiplier.maximum < multiplier.minimum || multiplier.experienceLimit < multiplier.experience ) {
		return false
	}
	
	groups = [].concat(groups)
	pairs = []
	
	while ( groups.length > 0 ) {
		group = groups.splice(encounterRandomInteger(groups.length), 1)[0]
		byExperience = new Object()
		candidates = 0
		costs = []
		
		for ( experienceKey of group ) {
			parts = experienceKey.split(':')
			key = parts[1]
			experience = +parts[0]
			creature = creatureByKey[key]
			
			if ( multiplier.experienceLimit && experience >= multiplier.experienceLimit ) {
				continue
			}
			
			if ( !byExperience[experience] ) {
				byExperience[experience] = []
				costs.push(experience)
			}
			
			byExperience[experience].push(creature)
			candidates += 1
		}
		
		if ( candidates < 2 ) {
			continue
		}
		
		if ( costs[costs.length - 1] * multiplier.maximum < multiplier.experience ) {
			continue
		}
		
		previous = false
		
		for ( upperIndex = costs.length ; upperIndex --> 0 ; ) {
			upperCost = costs[upperIndex]
			
			for ( lowerIndex = upperIndex ; lowerIndex --> 0 ; ) {
				lowerCost = costs[lowerIndex]
				
				for ( upperNumber = Math.floor(Math.min(multiplier.experienceLimit / upperCost, multiplier.maximum / 2)) ; upperNumber > 0 ; --upperNumber ) {
					lowerMaximum = Math.min(Math.floor((multiplier.experienceLimit - upperNumber * upperCost) / lowerCost), multiplier.maximum - upperNumber)
					lowerMinimum = Math.max(Math.ceil((multiplier.experience - upperNumber * upperCost) / lowerCost), multiplier.minimum - upperNumber)
					
					if ( lowerMaximum < lowerMinimum ) { continue }
					if ( lowerMinimum < upperNumber ) { continue }
					if ( previous && upperNumber === previous.upperNumber && lowerMaximum === previous.lowerMaximum ) { continue }
					
					lowerCreature = encounterRandomElement(byExperience[lowerCost])
					upperCreature = encounterRandomElement(byExperience[upperCost])
					lowerNumber = lowerMinimum < lowerMaximum ? lowerMinimum + encounterRandomInteger(1 + lowerMaximum - lowerMinimum) : lowerMinimum
					
					if ( environment == 'all' ) {
						environments = []
						
						for ( environment of upperCreature.environments ) {
							if ( lowerCreature.environments.indexOf(environment) >= 0 ) {
								environments.push(environment)
							}
						}
						
						if ( environments.length > 0 ) {
							environment = encounterRandomElement(environments)
						} else if ( lowerCreature.environments.indexOf('unspecified') >= 0 ) {
							environment = encounterRandomElement(upperCreature.environments)
						} else if ( upperCreature.environments.indexOf('unspecified') >= 0 ) {
							environment = encounterRandomElement(lowerCreature.environments)
						} else {
							environment = false
						}
					}
					
					pairs.push({
						'upperCreature':upperCreature,
						'upperExperience':upperCost,
						'upperNumber':upperNumber,
						'lowerCreature':lowerCreature,
						'lowerExperience':lowerCost,
						'lowerNumber':lowerNumber,
						'lowerMinimum':lowerMinimum,
						'lowerMaximum':lowerMaximum,
						'environment':environment
					})
					
					previous = pairs[pairs.length - 1]
					lowerIndex = 0
					break
				}
			}
		}
		
		if ( pairs.length > 0 ) {
			return encounterRandomElement(pairs)
		}
	}
	
	return false
}

function encounterIntegrateBestiary(encounter, bestiary) {
	var experienceForChallengeRating = encounter.experienceForChallengeRating
	var creature, creatureList = [], creatureBy = new Object()
	var challenge, name, experience, experienceKey
	var environment, synthesized = [], environments = []
	var language, languages, languageList = []
	var key, anyEnvironment = 'all', noEnvironment = 'unspecified'
	var entry, array, varieties, varietyList = []
	var type, typeList = []
	var group, where, found, synthesize
	
	creatureBy[anyEnvironment] = new Object()
	creatureBy[noEnvironment] = new Object()
	creatureBy.key = new Object()
	creatureBy.language = new Object()
	creatureBy.type = new Object()
	creatureBy.variety = new Object()
	
	synthesized.push(noEnvironment)
	
	for ( creature of bestiary.monster ) {
		entry = new Object()
		name = creature.name
		environment = creature.environment
		languages = creature.languages
		challenge = creature.cr
		type = creature.type
		varieties = false
		
		if ( Array.isArray(challenge) ) { challenge = challenge[0] }
		if ( challenge && challenge['cr'] ) { challenge = challenge['cr'] }
		
		if ( typeof challenge === 'string' && challenge.indexOf('/') >= 0 ) {
			challenge = challenge.split('/')
			challenge = challenge[0] / challenge[1]
		} else {
			challenge = +challenge
			
			if ( isNaN(challenge) ) {
				continue
			}
		}
		
		if ( typeof type === 'string' ) {
			type = type
		} else if ( type && type.type ) {
			varieties = type.tags
			type = type.type
		} else {
			type = "?"
		}
		
		if ( typeof varieties === 'string' ) {
			varieties = varieties.split(", ")
		} else if ( !Array.isArray(varieties) ) {
			varieties = []
		}
		
		if ( typeof languages === 'string' ) {
			languages = [languages]
		} else if ( Array.isArray(languages) ) {
			array = []
			
			for ( language of languages ) {
				if ( language.indexOf('understands') < 0 ) {
					language = language.replace(/ \(can.*\)$/g, '')
					language = language.replace(/ plus .*/g, '')
					language = language.replace(/ and (one|the) .*/g, '')
					language = language.replace(/and (.*) but .*/g, '$1')
					language = language.replace(/,? and /g, ', ')
					
					if ( language.charCodeAt(0) < 0x60 ) {
						array.push(language)
					}
				} else {
					language = language.replace(/,? and /g, ', ')
					language = language.replace(/understands (.*) but .*/g, '$1')
					language = language.replace(/understands /g, '')
					
					for ( language of language.split(', ') ) {
						if ( language.charCodeAt(0) < 0x60 ) {
							array.push(language)
						}
					}
				}
			}
			
			languages = array
		} else {
			languages = []
		}
		
		if ( !Array.isArray(environment) ) {
			environment = [noEnvironment]
		}
		
		experience = (challenge > 0 && challenge < 1) ? experienceForChallengeRating[1] * challenge : experienceForChallengeRating[challenge]
		experienceKey = "" + experience
		experienceKey = "        ".slice(0, 6 - experienceKey.length) + experienceKey
		
		entry.key = referenceKey(name)
		entry.name = name
		entry.type = type
		entry.challenge = challenge
		entry.experience = experience
		entry.experienceKey = experienceKey + ":" + entry.key
		entry.varieties = varieties
		entry.languages = languages
		entry.environments = environment
		
		creatureBy.key[entry.key] = entry
		creatureList.push(entry)
		
		if ( !creatureBy.type[type] ) {
			creatureBy.type[type] = []
			typeList.push(type)
		}
		creatureBy.type[type].push(entry.key)
		
		for ( key of varieties ) {
			if ( !creatureBy.variety[key] ) {
				creatureBy.variety[key] = []
				varietyList.push(key)
			}
			
			creatureBy.variety[key].push(entry.key)
		}
		
		for ( key of languages ) {
			if ( !creatureBy.language[key] ) {
				creatureBy.language[key] = []
				languageList.push(key)
			}
			
			creatureBy.language[key].push(entry.key)
		}
		
		for ( key of environment ) {
			if ( !creatureBy[key] ) {
				creatureBy[key] = new Object()
				environments.push(key)
			}
			
			if ( !creatureBy[key][challenge] ) {
				creatureBy[key][challenge] = []
			}
			
			creatureBy[key][challenge].push(entry.key)
		}
		
		if ( !creatureBy[anyEnvironment][challenge] ) {
			creatureBy[anyEnvironment][challenge] = []
		}
		
		creatureBy[anyEnvironment][challenge].push(entry.key)
	}
	
	creatureBy[anyEnvironment].groups = []
	
	for ( group of bestiary.encountergroup ) {
		found = []
		array = []
		where = new Object()
		
		if ( group.synthesize ) {
			synthesize = referenceKey(group.synthesize)
		} else {
			synthesize = false
		}
		
		if ( synthesize && !creatureBy[synthesize] ) {
			creatureBy[synthesize] = new Object()
			synthesized.push(synthesize)
		}
		
		for ( entry of creatureList ) {
			if (
				( group.list && group.list.indexOf(entry.name) >= 0 ) || ( (
				( group.name && entry.name.indexOf(group.name) >= 0 ) ||
				( group.type && group.type === entry.type ) ||
				( group.kind && entry.varieties.indexOf(group.kind) >= 0 ) ||
				( group.language && entry.languages.indexOf(group.language) >= 0 )
			) && !(
				( group.excludenames && group.excludenames.indexOf(entry.name) >= 0 ) ||
				( group.requiretype && group.requiretype !== entry.type )
			) ) )
			{
				if ( synthesize ) {
					challenge = entry.challenge
					
					if ( !creatureBy[synthesize][challenge] ) {
						creatureBy[synthesize][challenge] = []
					}
					
					creatureBy[synthesize][challenge].push(entry.key)
					entry.environments.push(synthesize)
					continue
				}
				
				array.push(entry.experienceKey)
				
				for ( environment of entry.environments ) {
					if ( !where[environment] ) {
						where[environment] = []
						found.push(environment)
					}
					
					where[environment].push(entry.experienceKey)
				}
			}
		}
		
		if ( group.synthesize ) {
			continue
		}
		
		for ( environment of found ) {
			if ( where[environment].length > 1 ) {
				if ( !creatureBy[environment].groups ) {
					creatureBy[environment].groups = []
				}
				
				where[environment].sort()
				creatureBy[environment].groups.push(where[environment])
			}
		}
		
		array.sort()
		creatureBy[anyEnvironment].groups.push(array)
	}
	
	typeList.sort()
	varietyList.sort()
	languageList.sort()
	synthesized.sort()
	environments.sort()
	encounter.list = new Object()
	encounter.list.types = typeList
	encounter.list.varieties = varietyList
	encounter.list.languages = languageList
	encounter.list.environments = environments.concat(synthesized)
	encounter.list.commonEnvironments = environments
	encounter.list.syntheticEnvironments = synthesized
	encounter.list.creatures = creatureList
	encounter.creatureBy = creatureBy
}


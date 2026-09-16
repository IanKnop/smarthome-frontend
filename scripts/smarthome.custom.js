/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Custom Functions
   
    (C) 2022 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

/* =========================================================
    CUSTOM SCRIPTS: AUTOMATIONS
   ========================================================= */
var AutomationUI = new function () {

    this.addAutomation = function () {

        Adapters.internal.setValue(getBindingInfo('automation'), Dataset.clearAutomationSource);
        Adapters.internal.setValue(getBindingInfo('automationWeekdays'), [true, true, true, true, true, true, true]);

        refreshStates();

        if (Dataset.sensorId == 'virtual/time' || Dataset.sensorId.startsWith('switch/')) {
            Dataset.automation.parameters = {};
            Dataset.automation.parameters.conditionProvider = (Dataset.sensorId == 'virtual/time' ? 'timeCode' : 'action');
            Dataset.automation.parameters.conditions = {};
        }

        SmartHomeUI.openWindow((Dataset.sensorId == 'virtual/time' ? 'windowAutomationSet' : 'windowSensorAutomationSet'));
    }

    this.setState = function (sender, mode = 'default') {

        if (mode == 'tuya') delete Dataset.actionSource.http;

        switch (sender) {

            case 'stateOn':
                if (Dataset.actionSource.stateOn) {

                    if (mode == 'tuya') {
                        var url = 'http://192.168.178.125:1880/smarthome/iobroker/set?deviceId=' + Dataset.actionSource.group + '&value=true';
                        Adapters.internal.setValue(getBindingInfo('actionSource.http'), url);
                    }

                    Adapters.internal.setValue(getBindingInfo('actionSource.sceneEnabled'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.stateOff'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.toggle'), false);

                } else {
                    if (mode == 'tuya') {
                        delete Dataset.actionSource.http;
                    }
                }
                break;
            case 'stateOff':
                if (Dataset.actionSource.stateOff) {

                    if (mode == 'tuya') {
                        var url = 'http://192.168.178.125:1880/smarthome/iobroker/set?deviceId=' + Dataset.actionSource.group + '&value=false';
                        Adapters.internal.setValue(getBindingInfo('actionSource.http'), url);
                    }

                    Adapters.internal.setValue(getBindingInfo('actionSource.sceneEnabled'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.stateOn'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.toggle'), false);

                } else {
                    if (mode == 'tuya') {
                        delete Dataset.actionSource.http;
                    }
                }
                break;
            case 'toggle':
                if (Dataset.actionSource.toggle) {
                    Adapters.internal.setValue(getBindingInfo('actionSource.sceneEnabled'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.stateOn'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.stateOff'), false);
                }
                break;
            case 'sceneEnabled':
                if (Dataset.actionSource.sceneEnabled) {
                    Adapters.internal.setValue(getBindingInfo('actionSource.stateOn'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.stateOff'), false);
                    Adapters.internal.setValue(getBindingInfo('actionSource.toggle'), false);
                }
                break;
        }
    }

    this.convertSensorAutomationsToList = function (payload) {

        /* convertSensorAutomationsToList()____________________________________________
        Converts JSON automations to formatted list                                   */

        if (payload != null) {
            try {

                if (!Array.isArray(payload)) payload = [payload];

                var returnData = [];
                var index = 0;
                payload.forEach(item => {

                    var weekdaysPretty = this.getPrettyWeekdays(item.weekdays);
                    if (typeof item.weekdays === 'string') item.weekdays = JSON.parse(item.weekdays);

                    if (JSON.stringify(item.weekdays) == JSON.stringify([true, true, true, true, true, true, true]))            weekdaysPretty = 'täglich';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([false, false, false, false, true, true, true]))   weekdaysPretty = 'Wochenende (inkl. Freitag)';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([false, false, false, false, false, true, true]))  weekdaysPretty = 'Wochenende';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([true, true, true, true, true, false, false]))     weekdaysPretty = 'wochentags';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([true, false, true, false, true, false, true]))    weekdaysPretty = 'alle zwei Tage';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([false, true, false, true, false, true, false]))   weekdaysPretty = 'alle zwei Tage';

                    returnData.push({
                        id:                 item.id,
                        description:        item.description,
                        parameters:         item.parameters,
                        conditions:         item.conditions,
                        conditionProvider:  item.conditionProvider,
                        weekdays:           item.weekdays,
                        weekdaysPretty:     weekdaysPretty,
                        timeStart:          item.timeStart,
                        timeEnd:            item.timeEnd,
                        enabled:            item.enabled,
                        enabledPretty:      item.enabled == true ? '<img src="/img/icons/2.0/switches/check.png" style="height: 2.75vmin;"></img>' : ''
                    });

                    index++;
                })

                return returnData;

            } catch (err) {

                return payload;

            }

        } else {

            return [];

        }
    }

    this.convertAutomationConditionsToList = function (payload) {

        /* convertAutomationConditionsToList()_________________________________________
        Converts JSON automations to formatted list                                   */

        if (payload != null) {
            try {

                if (!Array.isArray(payload)) payload = [payload];

                var returnData = [];
                var index = 0;
                payload.forEach(item => {

                    var weekdaysPretty = this.getPrettyWeekdays(item.weekdays);
                    if (typeof item.weekdays === 'string') item.weekdays = JSON.parse(item.weekdays);

                    if (JSON.stringify(item.weekdays) == JSON.stringify([true, true, true, true, true, true, true]))            weekdaysPretty = 'täglich';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([false, false, false, false, true, true, true]))   weekdaysPretty = 'Wochenende (inkl. Freitag)';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([false, false, false, false, false, true, true]))  weekdaysPretty = 'Wochenende';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([true, true, true, true, true, false, false]))     weekdaysPretty = 'wochentags';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([true, false, true, false, true, false, true]))    weekdaysPretty = 'alle zwei Tage';
                    else if (JSON.stringify(item.weekdays) == JSON.stringify([false, true, false, true, false, true, false]))   weekdaysPretty = 'alle zwei Tage';

                    returnData.push({
                        id:                 item.id,
                        description:        item.description,
                        parameters:         item.parameters,
                        conditions:         item.conditions,
                        conditionProvider:  item.conditionProvider,
                        weekdays:           item.weekdays,
                        weekdaysPretty:     weekdaysPretty,
                        timeStart:          item.timeStart,
                        timeEnd:            item.timeEnd,
                        enabled:            item.enabled,
                        enabledPretty:      item.enabled == true ? '<img src="/img/icons/2.0/switches/check.png" style="height: 2.75vmin;"></img>' : ''
                    });

                    index++;
                })

                return returnData;

            } catch (err) {

                return payload;

            }

        } else {

            return [];

        }
    }

    this.convertAutomationActionsToList = function (payload, params) {

        /* convertAutomationActionsToList()____________________________________________
        Converts JSON automation parameters to formatted list                            */

        //try {

            var index       = 0;
            var returnData  = [];
            payload         = parseFieldValues(params).automation;

            if (payload != undefined && payload.conditionProvider != undefined &&  payload.conditions != undefined) {

                Object.getOwnPropertyNames(payload.conditions).forEach(condition => {
                    if (condition != 'length') {
                        var automations = payload.conditions[condition];
                        if (!Array.isArray(automations)) automations = [automations];

                        var conditionPretty = this.getPrettyCondition(condition);

                        this.addAutomationItems(automations, returnData, condition, conditionPretty);
                    }
                });

            } /*else {

                var automations = Array.isArray(payload) ? payload : [payload];
                this.addAutomationItems(automations, returnData, null, this.getPrettyCondition());
            }*/

            return returnData;

       /*} catch (err) {

            return payload;

        }*/

    }

    this.getPrettyWeekdays = function (weekdays) {

        if (typeof weekdays !== 'string') weekdays = JSON.stringify(weekdays);

        var weekdaysPretty = '';
        switch (weekdays) {

            case JSON.stringify([true, true, true, true, true, true, true]):
                weekdaysPretty = 'täglich';
                break;
            case JSON.stringify([false, false, false, false, true, true, true]):
                weekdaysPretty = 'Wochenende (inkl. Freitag)';
                break;
            case JSON.stringify([false, false, false, false, false, true, true]):
                weekdaysPretty = 'Wochenende';
                break;
            case JSON.stringify([true, true, true, true, true, false, false]):
                weekdaysPretty = 'wochentags';
                break;
            case JSON.stringify([true, false, true, false, true, false, true]):
            case JSON.stringify([false, true, false, true, false, true, false]):
                weekdaysPretty = 'alle zwei Tage';
                break;
            default:
                weekdaysPretty = 'an diversen Tagen';
                break;
        }

        return weekdaysPretty;

    }


    this.getPrettyCondition = function (condition) {

        /* getPrettyCondition()_________________________________________________
        Converts JSON automation parameters to formatted list                  */

        if (condition != undefined) {

            var text = null;
            var size = '30px';

            if (condition.startsWith('AA')  || condition.startsWith('XR') || condition.startsWith('YR') || condition.startsWith('XS') || condition.startsWith('YS')) {

                var timetype    = condition.substring(0, 2);
                var timecode    = condition.substring(2);
                text            = '';
                
                switch (timetype) {

                    case 'AA':
                        var iconId = 'clock';
                        break;
                    case 'XR':
                    case 'YR':
                        text = '<span style="font-size: 2.5vmin">' + (timetype == 'XR' ? '–' : '+') + '</span>';
                        var iconId  = 'sun';
                        break;
                    case 'XS':
                    case 'YS':
                        text = '<span style="font-size: 2.5vmin">' +  (timetype == 'XS' ? '–' : '+') + '</span>';
                        var iconId  = 'night';
                        break;
                }
                
                text            += timecode.substring(0, 2) + ':' + timecode.substring(2, 4) + ':' + timecode.substring(4, 6);
                if (timecode == '000000' && timetype != 'AA') text = '';


            } else {

                switch (condition.toLowerCase()) {

                    case 'on_press':
                    case 'on-press':
                    case 'press':
                    case 'single':
                        var iconId = 'light-on';
                        break;
                    case 'on_hold':
                    case 'on-hold':
                    case 'hold':
                        var iconId = 'light-on';
                        var flavour = 'long'
                        break;
                    case 'off_press':
                    case 'off-press':
                    case 'off':
                        var iconId = 'light-off';
                        break;
                    case 'off_hold':
                    case 'off-hold':
                        var iconId = 'light-off';
                        var flavour = 'long'
                        break;
                    case 'on_double':
                    case 'on-double':
                    case 'double':
                        var iconId = 'light-on';
                        var flavour = 'twice'
                        break;
                    case 'on_tripple':
                    case 'on-tripple':
                    case 'tripple':
                        var iconId = 'light-on';
                        var flavour = 'tripple'
                        break;
                    case 'up_press':
                    case 'up-press':
                    case 'up':
                        var iconId = 'up';
                        break;
                    case 'down_press':
                    case 'down-press':
                    case 'down':
                        var iconId = 'down';
                        break;
                    case 'true':
                        var iconId = 'closed';
                        break;
                    case 'false':
                        var iconId = 'open';
                        break;
                    default:
                        var iconId = 'triggered';
                        break;
                }
            }
        }

        return this.getConditionIcon(iconId, flavour, text, size);

    }

    this.getConditionIcon = function (condition = 'triggered', flavour = null, text = null, size = '30px') {

        var returnValue = '<img src="img/icons/2.0/switches/' + condition + '.png" style="width: ' + size + '; height: ' + size + '; vertical-align: middle;"></img>';

        if (flavour != null)
            returnValue += '<img src="img/icons/2.0/switches/' + flavour + '.png" style="width: ' + size + '; height: ' + size + '; vertical-align: middle;"></img>';

        if (text != null)
            returnValue += '<span style="margin-left: 10px; font-weight: 600; font-size: 2.25vmin;">' + text + '</span>';

        return returnValue;
    }

    this.addAutomationItems = function (automations, returnData, condition = '', conditionPretty = '') {

        /* addAutomationItem()____________________________________________
        Converts JSON automation parameters to formatted list                  */

        var conditionIndex = {};
        automations.forEach(item => {

            if (condition != '' && conditionIndex[condition] == undefined) conditionIndex[condition] = 0;
            else if (condition != '') conditionIndex[condition]++;

            returnData.push({
                id: (condition != '' ? conditionIndex[condition] : returnData.length),
                group: item.group ?? null,
                name: DataConvert.normalizeDeviceName(item.group),
                action: this.getPrettyAction(item),
                scene: item.scene ?? 'keine',
                duration: (item.duration != undefined ? item.duration + ' s' : '&infin;'),
                fading: (item.fading != undefined ? item.fading + ' s' : 'kein'),
                fadingDuration: (item.fadingDuration != undefined ? item.fadingDuration + ' s' : 'kein'),
                requirements: item.requirements != undefined ? DataConvert.normalizeRequirements(item.requirements) : 'keine',
                condition: condition,
                conditionPretty: conditionPretty
            });

        });
    }

    this.getPrettyAction = function (item, size = '20px') {

        /* getPrettyAction()___________________________________________________________
        Returns icons for actions                                                    */

        var returnValue = '<span style="display: inline-flex; align-items: center;">';

        if (item.group.startsWith('tuya')) {

            // FANS/VENTS
            if (item.http != undefined && item.http.url != undefined && item.http.url.toLowerCase().includes('toggle'))
                returnValue += '<img src="img/icons/2.0/toggle.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';
            else if (item.http != undefined && item.http.url != undefined && item.http.url.toLowerCase().includes('value=true'))
                returnValue += '<img src="img/icons/2.0/on-2.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';
            else if (item.http != undefined && item.http.url != undefined && item.http.url.toLowerCase().includes('value=false'))
                returnValue += '<img src="img/icons/2.0/off.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';

        }

        if (item.set != undefined) {

            // LIGHTS AND DEVICES

            if (item.set.toggle != undefined && item.set.toggle == true)
                returnValue += '<img src="img/icons/2.0/toggle.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';

            if (item.set.state != undefined && (item.set.state.toLowerCase() == 'off' || item.set.state == false))
                returnValue += '<img src="img/icons/2.0/off.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';
            if (item.set.state != undefined && (item.set.state.toLowerCase() == 'on' || item.set.state == true))
                returnValue += '<img src="img/icons/2.0/on-2.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';

            if (item.set.color != undefined)
                returnValue += '<img src="img/icons/select_colors2.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';
            if (item.set.brightness != undefined)
                returnValue += '<img src="img/icons/scene_bright.svg" style="width: ' + size + '; height: ' + size + ';">&nbsp;';
            if (item.set.effect != undefined)
                returnValue += '<img src="img/icons/select_effect.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';
        }

        if (item.scene != undefined && item.scene != null)
            returnValue += '<img src="img/icons/2.0/scene-3.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';

        if (item.fading != undefined && item.fading != null)
            returnValue += '<img src="img/icons/2.0/fade-2.png" style="width: ' + size + '; height: ' + size + ';">&nbsp;';
        if (item.duration != undefined && item.duration != null)
            returnValue += item.duration + 's';



        return returnValue + '</span>';

    }

    this.readActionSource = function (sender) {

        /* readActionSource()___________________________________________________________
        Reads actionSource from UI compact format                                      */

        var params      = sender.payload;
        var isSchedule  = (params.condition != undefined && params.condition.length == 8 && [ 'AA', 'XR', 'YR', 'XS', 'YS' ].includes(params.condition.substring(0, 2)));

        if (Dataset.automation.conditions != undefined) {

            // IS CONDITION BASED
            if (!Array.isArray(Dataset.automation.conditions[params.condition])) Dataset.automation.conditions[params.condition] = [Dataset.automation.conditions[params.condition]];
            var payload = Dataset.automation.conditions[params.condition][params.id];

        } else {
            var payload = Dataset.automation;
        }

        var returnObject = { type: 'default', group: payload.group };

        // SCHEDULE PARAMETERS
        if (isSchedule) {
            returnObject.scheduledTime      = params.condition.substring(2, 4) + ':' + params.condition.substring(4, 6) + ':' + params.condition.substring(6, 8);
            returnObject.scheduledTimeType  = params.condition.substring(0, 2);
        }

        // STATE DEVICES & LIGHTS
        if (payload.set != undefined && payload.set.state != undefined) {
            returnObject.stateOn = (payload.set.state != undefined && payload.set.state.toString().toLowerCase().trim() == 'on');
            returnObject.stateOff = (payload.set.state != undefined && payload.set.state.toString().toLowerCase().trim() == 'off');
        } else {
            returnObject.stateOn = false;
            returnObject.stateOff = false;
        }

        // SCENE
        if (payload.scene != undefined) {
            returnObject.sceneEnabled = true;
            returnObject.scene = payload.scene;
        } else {
            returnObject.sceneEnabled = false;
            returnObject.scene = 10;
        }

        // TOGGLE
        if (payload.set != undefined && payload.set.toggle != undefined) returnObject.toggle = payload.set.toggle;
        else returnObject.toggle = false;

        // BRIGHTNESS
        if (payload.set != undefined && payload.set.brightness != undefined) {
            returnObject.brightnessEnabled = true;
            returnObject.brightness = payload.set.brightness;
        } else {
            returnObject.brightnessEnabled = false;
            returnObject.brightness = 255;
        }

        // BRIGHTNESS TRANSITION
        if (payload.set != undefined && payload.set.brightness_step != undefined) {
            returnObject.brightnessStepEnabled = true;
            returnObject.brightnessStep = payload.set.brightness_step;
            returnObject.transition = payload.set.transition ?? 0.5;
        } else {
            returnObject.brightnessStepEnabled = false;
            returnObject.brightnessStep = 40;
            returnObject.transition = 0.5;
        }

        // COLOR
        if (payload.set != undefined && payload.set.color != undefined) {
            returnObject.colorEnabled = true;
            returnObject.color = DataConvert.readColor(payload.set.color);
        } else {
            returnObject.colorEnabled = false;
            returnObject.color = DataConvert.createColor('white');
        }

        // AUTO-SHUT-OFF
        if (payload.duration != undefined) {
            returnObject.autoShutOffEnabled = true;
            returnObject.duration = payload.duration;

        } else {
            returnObject.autoShutOffEnabled = false;
            returnObject.duration = 60;
        }

        // FADING
        if (payload.fadingDuration != undefined) {
            returnObject.fadingDuration = payload.fadingDuration;
            returnObject.fading = payload.fading ?? 10;

        } else {
            returnObject.fadingDuration = 10;
            returnObject.fading = 10;
        }

        // EFFECT
        if (payload.set != undefined && payload.set.effect != undefined) {
            returnObject.effectEnabled = true;
            returnObject.effect = payload.set.effect;

        } else {
            returnObject.effectEnabled = false;
            returnObject.effect = 'none';
        }

        // KILL PREVIOUS
        if (payload.killPrevious != undefined && payload.killPrevious == true) {
            returnObject.killEnabled = true;
            returnObject.killDelay = payload.killDelay ?? 20;
            returnObject.killFade = payload.killFade ?? true;
        } else {
            returnObject.killEnabled = false;
            returnObject.killDelay = 20;
            returnObject.killFade = true;
        }

        // RULES
        if (payload.requirements != undefined && payload.requirements.filter(req => { return req.parameter == 'illuminance'; }).length > 0) {
            returnObject.illuminanceEnabled = true;
            returnObject.illuminance = payload.requirements.filter(req => { return req.parameter == 'illuminance'; })[0].value;
        } else {
            returnObject.illuminanceEnabled = false;
            returnObject.illuminance = 50;
        }

        if (payload.requirements != undefined && payload.requirements.filter(req => { return req.or != undefined && req.or[0].parameter == 'state' && req.or[0].condition == '=' && req.or[0].value == 'off' }).length > 0) {
            returnObject.blockEnabled = true;
        } else {
            returnObject.blockEnabled = false;
        }
        
        // STATE TUYA (via ioBroker)
        if (payload.http != undefined && payload.http.url != undefined && payload.http.url.toLowerCase().includes('tuya')) {

            returnObject.type   = 'tuya';

            if (payload.http.url.toLowerCase().includes('value=true')) 
                returnObject.stateOn    = true;
            else if (payload.http.url.toLowerCase().includes('value=false')) 
                returnObject.stateOff   = true;
            else if (payload.http.url.toLowerCase().includes('/toggle')) 
                returnObject.toggle     = true;

            returnObject.http = payload.http;
        }

        return returnObject;

    }

    this.writeActionSource = function (senderObject) {

        /* writeActionSource()__________________________________________________________
        Writes actionSource to adapter standard format                                */

        var payload         = senderObject.payload.data;
        var returnObject    = { group: payload.group };

        if ([ 'AA', 'XR', 'YR', 'XS', 'YS' ].includes(payload.scheduledTimeType)) {
            senderObject.payload.sensorCondition = payload.scheduledTimeType + payload.scheduledTime.substring(0, 2) + payload.scheduledTime.substring(3, 5) + payload.scheduledTime.substring(6, 8);
        }

        if (payload.group.startsWith('tuya/')) {

            returnObject.http = { }; 
            if (payload.http != undefined) {
                if (typeof payload.http === 'string') returnObject.http.url = payload.http;
                else returnObject.http = payload.http;              
            }                

        } else {

            returnObject.set          = { };
            returnObject.requirements = [ ];

            // STATE
            if (payload.stateOn != undefined && payload.stateOn) returnObject.set.state = 'on';
            if (payload.stateOff != undefined && payload.stateOff) returnObject.set.state = 'off';

            // TOGGLE
            if (payload.toggle != undefined && payload.toggle) returnObject.set.toggle = true;

            // BRIGHTNESS
            if (payload.brightnessEnabled != undefined && payload.brightnessEnabled) {
                returnObject.set.brightness = payload.brightness;
            }

            // BRIGHTNESS TRANSITION
            if (payload.brightnessStepEnabled != undefined && payload.brightnessStepEnabled) {
                returnObject.set.brightness_step = payload.brightnessStep;
                returnObject.set.transition = payload.transition;
            }

            // COLOR
            if (payload.colorEnabled != undefined && payload.colorEnabled) {
                returnObject.set.color = DataConvert.createColor(payload.color);
            }

            // SCENE
            if (payload.sceneEnabled != undefined && payload.sceneEnabled) {
                returnObject.scene = payload.scene;
            }

            // AUTO-SHUT-OFF
            if (payload.autoShutOffEnabled != undefined && payload.autoShutOffEnabled) {
                returnObject.duration = payload.duration;
                if (payload.fadingDuration != undefined) returnObject.fadingDuration = payload.fadingDuration;
                if (payload.fading != undefined) returnObject.fading = payload.fading;
            }

            // EFFECT
            if (payload.effectEnabled != undefined && payload.effectEnabled) {
                returnObject.set.effect = payload.effect;
            }

            /*// KILL PREVIOUS
            if (payload.killEnabled != undefined) {
                returnObject.killPrevious = payload.killEnabled;
                returnObject.killDelay = payload.killDelay ?? null;
                returnObject.killFade = payload.killFade ?? false;
            }*/

            // RULES
            if (payload.illuminanceEnabled != undefined && payload.illuminanceEnabled) {
                returnObject.requirements.push({
                    type:       'sensor',
                    source:     senderObject.payload.sensorId,
                    parameter:  'illuminance',
                    value:      payload.illuminance,
                    condition:  '<='
                });
            }

        }
        
        if (payload.blockEnabled != undefined && payload.blockEnabled) {
            returnObject.blockEnable = true;
            returnObject.requirements.push({
                or: [
                    {
                        type: 'group',
                        source: payload.group,
                        parameter: 'state',
                        value: 'off',
                        condition: '='
                    },
                    {
                        type: 'group',
                        source: payload.group,
                        parameter: 'scene',
                        value: '9',
                        condition: '='
                    }
                ]
            });
        } else {
            returnObject.blockEnable = false;
        }

        if (returnObject.set != undefined && Object.getOwnPropertyNames(returnObject.set).length == 0) delete returnObject.set;
        this.writeActionParameters(returnObject, senderObject);


    }

    this.writeActionParameters = function (returnObject, senderObject) {

        /* writeActionParameters()_______________________________________________________
        Writes action to parameters list                                                */

        //if (sensorCondition != undefined) sensorCondition = sensorCondition.toString();
        //if (sensorCondition != undefined && sensorCondition.trim() != '-1' && sensorCondition.trim() != '') {

        var isSchedule          = Dataset.originalSensorCondition != undefined && Dataset.originalSensorCondition.length == 8 && [ 'AA', 'XR', 'YR', 'XS', 'YS' ].includes(Dataset.originalSensorCondition.substring(0, 2));
        var sensorCondition     = senderObject.payload.sensorCondition != '-1' ? senderObject.payload.sensorCondition : 'true';
        var conditionChanged    = false;

        if (Dataset.automation == undefined || Dataset.automation == null)
            Dataset.automation = {};

        if (Dataset.automation.conditions == undefined || Dataset.automation.conditions == null || Dataset.automation.conditions == '')
            Dataset.automation.conditions = {};

        if (sensorCondition != '-1' && Dataset.automation.conditions[sensorCondition] == undefined)
            Dataset.automation.conditions[sensorCondition] = [];
    
        if (senderObject.payload.sensorId.startsWith('motion/')) {
            Dataset.automation.conditionProvider = 'occupancy';
            Dataset.automation.conditions[sensorCondition] = [];
        }
        else if (senderObject.payload.sensorId.startsWith('switch/')) Dataset.automation.conditionProvider = 'action';
        else if (senderObject.payload.sensorId.startsWith('window/')) Dataset.automation.conditionProvider = 'contact';
        else if (senderObject.payload.sensorId.startsWith('virtual/time')) Dataset.automation.conditionProvider = 'timecode';

        if (Dataset.originalSensorCondition != undefined && sensorCondition != Dataset.originalSensorCondition) {

            // CONDITION WAS CHANGED
            conditionChanged = true;
            Dataset.automation.conditions[Dataset.originalSensorCondition].splice(senderObject.payload.actionId, 1);

            if (Dataset.automation.conditions[Dataset.originalSensorCondition].length == 0) delete Dataset.automation.conditions[Dataset.originalSensorCondition];
            Dataset.originalSensorCondition = undefined;
        }

        if (conditionChanged) Dataset.automation.conditions[sensorCondition].push(returnObject);
        else {
            if (senderObject.payload.actionId == -1) senderObject.payload.actionId = Object.keys(Dataset.automation.conditions[sensorCondition]).length;
            Dataset.automation.conditions[sensorCondition][senderObject.payload.actionId] = returnObject;
        }

        /*} else if (senderObject.payload.actionId != undefined) {

            if (Dataset.automation == undefined || Dataset.automation == null)
                Dataset.automation = [];

            if (senderObject.payload.actionId == -1) senderObject.payload.actionId = Dataset.automation.length;
            Dataset.automation.parameters[senderObject.payload.actionId] = returnObject;
        }*/


    }

    this.deleteAction = function (id, condition) {

        /* deleteAction()_______________________________________________________________
        Delete action from parameters list                                              */

        delete Dataset.automation.conditions[condition].splice(id, 1);
        if (Dataset.automation.conditions[condition].length == 0) delete Dataset.automation.conditions[condition];
     
        refreshStates(true);
    }

}


/* =========================================================
    CUSTOM SCRIPTS: SURVEILLANCE
   ========================================================= */
var Surveillance = new function () {

    this.switchMode = function (mode = 'live') {

        Adapters.internal.setValue(getBindingInfo('mode'), mode);

    }

    this.loadVideo = function (src) {

        var playerControl = document.getElementById('cam-video-player');
        
        if (player != null) player.destroy();

        // REMOVE FORMER SOURCE
        playerControl.pause();
        //playerControl.removeAttribute("src");
        playerControl.load();
        
        // ADD NEW SOURCE
        playerControl.src = src;
        playerControl.load();
        playerControl.play();
    }

    this.convertVideoArchiveToList = function (payload) {

        //var returnArray = [{ category: '<strong style="font-size: 4vmin; border: 2px solid #fec77f; padding-left: 5px; padding-right: 5px;" onclick="sendRequest(\'internal\', \'value\');">Live</strong>' }];
        var url         = 'videos';
        var returnArray = [ ];
        
        if (payload != null) Object.keys(payload).forEach(category => {

            //returnArray.push({ category: '<strong style="font-size: 4vmin;">' + category + '</strong>' });
            Object.keys(payload[category]).forEach(year => {

                Object.keys(payload[category][year]).forEach(month => {
                    //returnArray.push({ category: '<strong style="font-size: 3.25vmin;">' + this.getMonthName(month) + '</strong>' });

                    Object.keys(payload[category][year][month]).forEach(day => {

                        // Remove 'day-' from beginning of day-property
                        var dayInt = day.substring(4);

                        returnArray.push({ category: '<strong style="font-size: 3.0vmin;">' + this.getWeekday(dayInt, month - 1, year) + ', der ' + dayInt + '.' + month + '.' + year + '</strong>' });

                        payload[category][year][month][day].forEach(file => {

                            var timecode    = file.substring(file.length - 6);
                            var hour        = timecode.substring(0, 2);
                            var place       = file.substring(0, file.indexOf('_'));
                            var exp         = '<strong>' + this.getDaytime(hour) +
                                              timecode.substring(0, 2) + ':' + timecode.substring(2, 4) + ' Uhr' + '</strong><br/>' + this.getWeekday(dayInt, month - 1, year) + ', der ' + dayInt + '.' + month + '.' + year + '<br/>';

                            var fileName    = url + '/' + this.getLocationFolder(place) + '/' + year + '/' + month + '/' + dayInt + '/' + file;
                            var linkPrefix = '<img src="' + fileName + '.jpg" style="max-width: 100%; margin-bottom: 15px; margin-top: 15px;" onclick="Surveillance.loadVideo(\'' + fileName + '.mp4\');"><br/><span class="" onclick="Surveillance.loadVideo(\'' + file.substring(1) + '.mp4\');" style="font-size: 2vmin; line-height: calc(2vmin + 4px); display: block; margin-top: -10px;">';
                            var linkSuffix = '</span>';

                            returnArray.push({ category: linkPrefix + exp + linkSuffix });

                        });
                    });
                });
            });
        });

        return returnArray;
    }

    this.getDaytime = function (hour) {

        if (parseInt(hour) < 5) return 'Nachts, ';
        else if (parseInt(hour) < 12) return 'Morgens, ';
        else if (parseInt(hour) < 18) return 'Mittags, ';
        else if (parseInt(hour) < 23) return 'Abends, ';
        else return 'Nachts, ';
    }

    this.getLocationFolder = function (place) {

        if (place.toUpperCase().includes('GARTEN')) return 'Garten';
        else if (place.toUpperCase().includes('EINGANG')) return 'Eingang';
        else return 'Klingel';
    }

    this.getWeekday = function (day, month, year) {

        var currentDate = new Date(year, month, day);

        switch (currentDate.getDay()) {
            case 1:
                return 'Montag';
            case 2:
                return 'Dienstag';
            case 3:
                return 'Mittwoch';
            case 4:
                return 'Donnerstag';
            case 5:
                return 'Freitag';
            case 6:
                return 'Samstag';
            case 0:
                return 'Sonntag';
        }
    }

    this.getMonthName = function (month) {

        switch (parseInt(month)) {

            case 1:
                return 'Januar';
            case 2:
                return 'Februar';
            case 3:
                return 'März';
            case 4:
                return 'April';
            case 5:
                return 'Mai';
            case 6:
                return 'Juni';
            case 7:
                return 'Juli';
            case 8:
                return 'August';
            case 9:
                return 'September';
            case 10:
                return 'Oktober';
            case 11:
                return 'November';
            case 12:
                return 'Dezember';

        }

    }


}

var BringList = new function() {

    /* =========================================================
       BRING LIST: Bring Shopping List via ioBroker
       ========================================================= */
    this.ioBrokerId     = 'bring.0.f01890f1-bca6-456d-909f-b30e3abd31d9';

    this.pendingAdds    = [];
    this.pendingRemoves = [];

    this.convertList = function (payload) {

        /* convertList()_______________________________________________________________
        Converts JSON to pretty shopping list                                         */

        if (payload != null || this.pendingAdds.length > 0) {
            try {

                payload = JSON.parse(payload) ?? this.pendingAdds;
                if (!Array.isArray(payload)) payload = [ payload ];

                // ADD PENDING ADDS TO LIST (if not already present)    
                this.pendingAdds.forEach(item => { 
                    if (payload.findIndex(findItem => findItem.name == item.name) == -1) payload.push(item);
                    else this.pendingAdds.splice(this.pendingAdds.findIndex(addItem => addItem.name == item.name), 1);
                });

                // REMOVE PENDING REMOVES FROM LIST (if present)
                this.pendingRemoves.forEach(item => { 
                    var removeIndex = payload.findIndex(findItem => findItem.name == item.name);
                    
                    if (removeIndex != -1) payload.splice(removeIndex, 1);
                    else this.pendingRemoves.splice(this.pendingRemoves.findIndex(removeItem => removeItem.name == item.name), 1);
                });

                var returnData = '<ul id="bringList" class="bring-list">';
                var index = 0;
                payload.forEach(item => {
                    var eventString = "BringList.removeItem(\'" + item.name + "\', '" + this.getItemId(item.name) + "');";
                    returnData += this.getControlAsHTML(item.name);
                    index++;
                })

                return returnData + '</ul>';

            } catch (err) {
                return payload;
            }

        } else {

            return 'Einkaufsliste ist leer';

        }
    }

    this.getItemId = function (item) {

        return item.toLowerCase().replace(/ /g, '').trim();
    }

    this.getControlAsHTML = function(item) {

        var eventString = "BringList.removeItem(\'" + item + "\', '" + this.getItemId(item) + "');";
        return '<li id="' + this.getItemId(item) + '" class="bring-list-item"><span class="bring-list-text">' + item + '</span><img class="bring-list-x" src="../img/icons/2.0/switches/x.png" onclick="' + eventString + '"></li>';
    }

    this.addItem = function (item) {
        
        // ADD ITEM TO SHOPPING LIST
        this.pendingAdds.push({ specification: '', name: item });
        sendRequest('iobroker', 'set', { deviceId: this.ioBrokerId + '.saveItem', value: item }, null, '');
    }

    this.removeItem = function (item, senderId) {
        
        // REMOVE ITEM FROM SHOPPING LIST
        this.pendingRemoves.push({ specification: '', name: item });
        sendRequest('iobroker', 'set', { deviceId: this.ioBrokerId + '.removeItem', value: item }, null, '');
    }
}

/* =========================================================
    CUSTOM SCRIPTS: DATA CONVERSION
   ========================================================= */
var DataConvert = new function () {

    this.countdowns = {};
    this.handleCountdown = function (payload, params, bindingInfo) {
        
        if (bindingInfo != undefined) {
            if (payload != null && params != undefined ) {

                if (payload == 0) {
                    Dataset[bindingInfo.binding] = '';
                    if (this.countdowns[bindingInfo.binding] != undefined) {
                        clearInterval(this.countdowns[bindingInfo.binding].interval);
                        delete this.countdowns[bindingInfo.binding];
                        refreshControls(bindingInfo);
                    }
                } else if (payload != 0 && this.countdowns[bindingInfo.binding] == undefined) {
                    this.countdowns[bindingInfo.binding] = {
                        target:     payload,
                        interval:   setInterval(() => {
                            var prefix  = params['prefix'] != undefined ? params['prefix']: '';
                            var seconds = (Math.max(0, payload - Date.now()) / 1000);

                            var value   = '';
                            if (seconds > 60)       value = prefix + Math.round(seconds / 60) + ' Minuten';
                            else if (seconds > 0)   value = prefix + String(Math.round(seconds)) + ' Sekunde' + (seconds != 1 ? 'n' : '');

                            Dataset[bindingInfo.binding] = value;
                            refreshControls(bindingInfo);
                        }, 1000)
                    }
                } 
            }
            return Dataset[bindingInfo.binding];
        }
    }

    this.convertScheduleParametersToList = function (payload) {

        /* convertScheduleParametersToList()____________________________________________
        Converts JSON schedule automation (virtual/time) parameters to formatted list  */

        if (typeof payload === 'object' && payload != null) {

            var timeline = payload.conditions;
            var returnData = [];

            Object.keys(timeline).forEach(timeCode => {

                var prettyAction = '';
                var action = timeline[timeCode];
                var group = (action.group != undefined ? action.group : (action.device != undefined ? action.device : (action.target != undefined ? action.target : null)));

                var timeType = (action.action.timeType != undefined ? action.action.timeType : 'time');
                var prettyTimeType = this.normalizeTimeType(timeType);

                //var target        = this.normalizeDeviceName(group.substr(group.indexOf('/') + 1, 1).toUpperCase() + group.substr(group.indexOf('/') + 2)).trim();
                var target = this.normalizeDeviceName(group, false).trim();
                var device = this.getDeviceCommonName(group);

                if (action.set != undefined) {

                    switch (action.set.state) {

                        case true: case 'on':
                            prettyAction = '<strong style="color: var(--green)">AN</strong>&nbsp;&nbsp;';
                            break;

                        case false: case 'off':
                            prettyAction = '<strong style="color: var(--red)">AUS</strong>&nbsp;&nbsp;';
                            break;

                        default:
                            prettyAction = action.set.state.toUpperCase();
                    }
                }

                if (action.group.startsWith('light') || action.group.startsWith('group')) {
                    if (action.action.sceneEnabled != undefined && action.action.sceneEnabled) prettyAction += '★&nbsp;&nbsp;';
                    if (action.action.brightnessEnabled != undefined && action.action.brightnessEnabled) prettyAction += '☀&nbsp;' + (action.set.brightness != undefined ? action.set.brightness : 255) + '&nbsp;&nbsp;';
                    if (action.action.colorEnabled != undefined && action.action.colorEnabled) prettyAction += '☯&nbsp;&nbsp;';
                    if (action.action.effectEnabled != undefined && action.action.effectEnabled) prettyAction += '☇&nbsp;&nbsp;';
                }

                var time = timeCode.substring(2, 4) + ':' + timeCode.substring(4, 6) + ':' + timeCode.substring(6, 8);
                returnData.push({ 
                    timeCode: timeCode, 
                    time: time, 
                    timeType: timeType, 
                    prettyTimeType: prettyTimeType, 
                    sensorType: device, 
                    deviceId: group, 
                    name: target, 
                    action: action, 
                    prettyAction: prettyAction 
                });

            });

            /* SORT ARRAY BY TIMECODE */
            returnData = returnData.sort((a, b) => a.time.replace(/:/g, '') - b.time.replace(/:/g, ''));

            return returnData;

        } else {

            return payload;

        }
    }

    this.cleanParameters = function (payload) {

        /* convertParametersToList()____________________________________________
        Converts JSON automation parameters to formatted list                  */

        if (typeof payload === 'object' && payload != null && payload.conditions != undefined) {

            var returnObject = Object.assign({}, payload);

            for (var index = 0; index < Object.keys(returnObject.conditions).length; index++) {

                var key = Object.keys(returnObject.conditions)[index];

                // DELETE SCENE IF NOT SET
                if (returnObject.conditions[key].action.sceneEnabled == undefined || returnObject.conditions[key].action.sceneEnabled == false || returnObject.conditions[key].scene == '-1' || returnObject.conditions[key].scene == null || returnObject.conditions[key].scene == 'null') {
                    delete returnObject.conditions[key].scene;
                }

                // NO BRIGHTNESS SET
                if (returnObject.conditions[key].action.brightnessEnabled == undefined || returnObject.conditions[key].action.brightnessEnabled == false || returnObject.conditions[key].action.brightnessEnabled == '') {
                    delete returnObject.conditions[key].set.brightness;
                }

                // NO COLOR SET
                if (returnObject.conditions[key].action.colorEnabled == undefined || returnObject.conditions[key].action.colorEnabled == false || returnObject.conditions[key].action.colorEnabled == '') {
                    delete returnObject.conditions[key].set.color;
                }

                // NO EFFECT SET
                if (returnObject.conditions[key].action.effectEnabled == undefined || returnObject.conditions[key].action.effectEnabled == false || returnObject.conditions[key].action.effectEnabled == '') {
                    delete returnObject.conditions[key].set.effect;
                }
            }

        } else {

            returnObject = Object.assign({}, payload);

        }

        return returnObject;

    }

    this.trimParameters = function (payload) {

        /* trimParameters()_____________________________________________________
        Modifies parameters object so that it is compatible to backend         */

        return payload;

    }

    this.normalizeDeviceValues = function (devices, params) {

        var returnObject = null;

        if (devices != undefined && devices != null) {

            returnObject = new Object();
            //Object.keys(devices).sort().forEach(deviceKey => {
            devices.forEach(deviceKey => {
                if (params.filter == undefined || deviceKey.match(params.filter))
                    returnObject[deviceKey] = this.normalizeDeviceName(deviceKey);

            });
        }

        return returnObject;
    }

    this.normalizeDeviceName = function (deviceId, showType = true) {

        var returnValue = '';

        var deviceType = deviceId.substring(0, deviceId.indexOf('/'));
        var deviceName = deviceId.substring(deviceId.indexOf('/') + 1);

        return (showType ? this.normalizeDeviceType(deviceType).trim() + ' ' : '') + this.normalizeDeviceOriginalName(deviceName);

    }


    this.normalizeDeviceType = function (deviceType) {

        switch (deviceType.toLowerCase()) {

            case 'motion':
                return 'Bewegung';
            case 'group':
                return 'Gruppe';
            case 'switch':
                return 'Schalter';
            case 'plug':
                return 'Steckdose';
            case 'valve':
                return 'Ventil';
            case 'pump':
                return 'Pumpe';
            case 'light':
                return 'Licht';
            case 'climate':
                return 'Klima';
            case 'leak':
                return 'Feuchtigkeit';
            case 'midea':
                return 'Midea';
            case 'tuya':
                return '';
            case 'tuya-fan':
                return '';

            default:
                return '';

        }
    }

    this.normalizeDeviceOriginalName = function (deviceName) {

        var returnValue = '';

        returnValue = deviceName.replace(/_table/g, ' Tischlampe');
        returnValue = returnValue.replace(/_stand/g, ' Stehlampe');
        returnValue = returnValue.replace(/_spot_c/g, ' - Spot C');
        returnValue = returnValue.replace(/_spot_w/g, ' - Spot W');
        returnValue = returnValue.replace(/_c/g, ' - C');
        returnValue = returnValue.replace(/_w/g, ' - W');
        returnValue = returnValue.replace(/_ball_s/g, ' - Kugel (klein) ');
        returnValue = returnValue.replace(/_ball_m/g, ' - Kugel (mittel) ');
        returnValue = returnValue.replace(/_ball_l/g, ' - Kugel (groß) ');

        returnValue = returnValue.replace(/living_/g, ' Wohnzimmer - ');
        returnValue = returnValue.replace(/living/g, ' Wohnzimmer ');

        returnValue = returnValue.replace(/dining_/g, ' Esszimmer - ');
        returnValue = returnValue.replace(/dining/g, ' Esszimmer ');

        returnValue = returnValue.replace(/kitchen_/g, ' Küche - ');
        returnValue = returnValue.replace(/kitchen/g, ' Küche ');

        returnValue = returnValue.replace(/bath_/g, ' Bad - ');
        returnValue = returnValue.replace(/bath/g, ' Bad ');

        returnValue = returnValue.replace(/dressing_/g, ' Ankleidezimmer - ');
        returnValue = returnValue.replace(/dressing/g, ' Ankleidezimmer ');

        returnValue = returnValue.replace(/bedroom_/g, ' Schlafzimmer - ');
        returnValue = returnValue.replace(/bedroom/g, ' Schlafzimmer ');

        returnValue = returnValue.replace(/dining_/g, ' Esszimmer - ');
        returnValue = returnValue.replace(/dining/g, ' Esszimmer ');

        returnValue = returnValue.replace(/storage_/g, ' Abstellraum - ');
        returnValue = returnValue.replace(/storage/g, ' Abstellraum ');

        returnValue = returnValue.replace(/maintenance_/g, ' Hauswirtschaftsraum - ');
        returnValue = returnValue.replace(/maintenance_/g, ' Hauswirtschaftsraum ');

        returnValue = returnValue.replace(/maintenance/g, ' Hauswirtschaftsraum ');

        returnValue = returnValue.replace(/hallway_0_/g, ' Flur EG - ');
        returnValue = returnValue.replace(/hallway_1_/g, ' Flur 1.OG - ');
        returnValue = returnValue.replace(/hallway_2_/g, ' Flur 2.OG - ');

        returnValue = returnValue.replace(/hallway_0/g, ' Flur EG ');
        returnValue = returnValue.replace(/hallway_1/g, ' Flur 1.OG ');
        returnValue = returnValue.replace(/hallway_2/g, ' Flur 2.OG ');

        returnValue = returnValue.replace(/entrance/g, ' Eingang ');
        returnValue = returnValue.replace(/barn/g, ' Gartenhütte ');
        returnValue = returnValue.replace(/stairs/g, ' Treppe ');
        returnValue = returnValue.replace(/pump/g, ' Pumpe ');
        returnValue = returnValue.replace(/toilette/g, ' Gäste-WC ');
        returnValue = returnValue.replace(/side/g, ' Garten (Seite) ');
        returnValue = returnValue.replace(/terrace/g, ' Garten (Terasse) ');
        returnValue = returnValue.replace(/garden/g, ' Garten ');
        returnValue = returnValue.replace(/rooftop/g, ' Dachterasse ');
        returnValue = returnValue.replace(/roof/g, ' Dach ');
        returnValue = returnValue.replace(/skydeck/g, ' Dachterasse ');
        returnValue = returnValue.replace(/mirror/g, ' Spiegel ');
        returnValue = returnValue.replace(/strip_/g, 'streifen ');
        returnValue = returnValue.replace(/steckdose_/g, ' Steckdose ');
        returnValue = returnValue.replace(/steckdose/g, ' Steckdose');

        returnValue = returnValue.replace(/_hps/g, ' Präsenzsensor');

        returnValue = returnValue.replace(/ian/g, ' Ian ');
        returnValue = returnValue.replace(/susanne/g, ' Susanne ');
        returnValue = returnValue.replace(/_/g, ' ');

        returnValue = this.capitalizeWords(returnValue);

        return returnValue;
    }

    this.normalizeRequirements = function (requirements) {

        /* normalizeRequirements()_____________________________________________
        Show human readable requirements                                      */

        var returnTexts = [];

        if (requirements != undefined && Array.isArray(requirements)) requirements.forEach(req => {
            if (req.parameter == 'illuminance') returnTexts.push('bei Bedarf');
            if (req.or != undefined && req.or[1] != undefined && req.or[1].value == '9') returnTexts.push('wenn Licht aus');
        });

        if (returnTexts.length == 0) return 'keine';
        else return returnTexts.join(', ');

    }

    this.capitalizeWords = function (str) {
        return str.replace(/(^|\s)(\S)/gu, (_, space, char) => space + char.toUpperCase()).trim();
    }

    this.getDeviceCommonName = function (deviceName) {

        /* getDeviceCommonName()_______________________________________________
        Gets device name in human readable form                               */

        return (deviceName.startsWith('motion') ? 'Bewegung' :
            (deviceName.startsWith('group') ? 'Gruppe' :
                (deviceName.startsWith('plug') ? 'Steckdose' :
                    (deviceName.startsWith('light') ? 'Lampe' :
                        (deviceName.startsWith('valve') ? 'Ventil' :
                            (deviceName.startsWith('tuya-fan') ? 'Tuya' :
                                (deviceName.startsWith('tuya') ? 'Tuya' :
                                    (deviceName.startsWith('midea') ? 'Midea' :
                                        (deviceName.startsWith('pump') ? 'Pumpe' : null)))))))));
    }

    this.createTimeCode = function (actionTime) {

        if (actionTime != undefined && actionTime != null && actionTime != '') {

            var timeType = getBindingValue(getBindingInfo('actionTimeType'));

            if (timeType == 'time' || timeType == '') timeType = 'AA';
            if (timeType == 'beforeSunrise') timeType = 'XR';
            if (timeType == 'afterSunrise') timeType = 'YR';
            if (timeType == 'beforeSunset') timeType = 'XS';
            if (timeType == 'afterSunset') timeType = 'YS';

            return timeType + actionTime.replace(/:/g, '');

        } else {

            return '';

        }

    }

    this.createColor = function (colorId) {

        if (colorId != undefined && typeof colorId === 'string' && colorId != '') {
            switch (colorId.toLowerCase()) {

                case 'blue':
                    return { hue: 236, saturation: 100 };
                case 'turqoise':
                    return { hue: 195, saturation: 100 };
                case 'magenta':
                    return { hue: 338, saturation: 100 };
                case 'violett':
                    return { hue: 251, saturation: 95 };
                case 'red':
                    return { hue: 359, saturation: 100 };
                case 'orange':
                    return { hue: 8, saturation: 100 };
                case 'yellow':
                    return { hue: 40, saturation: 100 };
                case 'green':
                    return { hue: 123, saturation: 100 };
                case 'icewhite':
                    return { hue: 191, saturation: 10 };
                case 'warmwhite':
                    return { hue: 39, saturation: 56 };
                case 'candlewhite':
                    return { hue: 22, saturation: 97 };
                case 'white':
                default:
                    return { hue: 222, saturation: 0 };

            }
        } else return colorId;

    }

    this.readColor = function (payload) {

        if (typeof payload !== 'string') payload = JSON.stringify(payload);

        switch (payload) {

            case JSON.stringify({ hue: 236, saturation: 100 }):
                return 'blue';
            case JSON.stringify({ hue: 195, saturation: 100 }):
                return 'turqoise';
            case JSON.stringify({ hue: 338, saturation: 100 }):
                return 'magenta';
            case JSON.stringify({ hue: 251, saturation: 95 }):
                return 'violett';
            case JSON.stringify({ hue: 359, saturation: 100 }):
                return 'red';
            case JSON.stringify({ hue: 8, saturation: 100 }):
                return 'orange';
            case JSON.stringify({ hue: 40, saturation: 100 }):
                return 'yellow';
            case JSON.stringify({ hue: 123, saturation: 100 }):
                return 'green';
            case JSON.stringify({ hue: 191, saturation: 10 }):
                return 'icewhite';
            case JSON.stringify({ hue: 39, saturation: 56 }):
                return 'warmwhite';
            case JSON.stringify({ hue: 22, saturation: 97 }):
                return 'candlewhite';
            default:
                return 'white';

        }

    }

    this.normalizeTimeType = function (timeType) {

        switch (timeType) {

            case 'time': return '';
            case 'afterSunset': return '→&nbsp;☾';
            case 'beforeSunset': return '←&nbsp;☾';
            case 'afterSunrise': return '→&nbsp;☀';
            case 'beforeSunrise': return '←&nbsp;☀';
        }

        return '';

    }

}

/* =========================================================
    CUSTOM SCRIPTS: HEATING PROFILES
   ========================================================= */
var HeatingProfiles = new function () {

    const PROFILE_NEVER = 'nie';

    this.getProfileName = function (weekdays, start, end, capitals = 0) {

        /* getProfileName()____________________________________________________
        Creates heating profile name based on settings                        */

        var daysValue = this.getDaysValue(weekdays);
        var returnValue = daysValue + (daysValue != PROFILE_NEVER ? ' (' + this.betweenTime(start, end) + ')' : '');

        if (capitals == 1) returnValue = returnValue.substring(0, 1).toUpperCase() + returnValue.substring(1);
        else if (capitals == 2) returnValue = returnValue.toUpperCase();

        return returnValue;
    }

    this.getDaysValue = function (weekdays) {

        /* getDaysValue()______________________________________________________
        Get text representing the selected days                               */

        switch (weekdays) {

            case '0,1,2,3,4,5,6': return 'täglich';
            case '0,1,2,3,4': return 'wochentags';
            case '0,1,2,3': case '0,1,2': case '0,1': return 'Wochenanfang';
            case '1,2,3': case '1,2': case '2,3': return 'Wochenmitte';
            case '4,5,6': case '5,6': return 'Wochenende';
            case '0': return 'montags';
            case '1': return 'dienstags';
            case '2': return 'mittwochs';
            case '3': return 'donnerstags';
            case '4': return 'freitags';
            case '5': return 'samstags';
            case '6': return 'sonntags';
            case '': case null: case undefined: return PROFILE_NEVER;
            default: return 'diverse Tage';
        }
    }

    this.betweenTime = function (start, end) {

        /* betweenTime()________________________________________________________
        Checks if value lies between given time of the day                     */

        var startHour = start.substring(0, 2);
        var endHour = end.substring(0, 2);
        var timeValue = '';

        if (startHour == endHour) {
            return 'ganztägig';
        }
        else if (startHour >= 6 && endHour <= 12 && endHour >= startHour) {
            return 'vormittags';
        }
        else if (startHour >= 6 && endHour <= 18 && endHour >= startHour) {
            return 'tagsüber';
        }
        else if (startHour >= 12 && endHour <= 18 && endHour >= startHour) {
            return 'nachmittags';
        }
        else if (startHour >= 16 && endHour <= 23 && endHour >= startHour) {
            return 'abends';
        }
        else if ((startHour >= 22 || (startHour >= 0 && startHour < 6)) && (endHour >= 22 || endHour < 8)) {
            return 'nachts';
        }
        else return this.getCombTimeExp(startHour, endHour);
    }

    this.getCombTimeExp = function (start, end) {

        /* getCombTimeExp()____________________________________________________
        Gets combined expression for further time frames                      */

        var startValue = '';
        if (start == 0) {
            startValue = 'Mitternacht';
        }
        else if (start >= 6 && start < 12) {
            startValue = 'morgens';
        }
        else if (start == 12) {
            startValue = 'Mittag';
        }
        else if (start >= 12 && start < 15) {
            startValue = 'mittags';
        }
        else if (start >= 15 && start < 19) {
            startValue = 'nachmittags';
        }
        else if (start >= 19 && start <= 21) {
            startValue = 'abends';
        }
        else if (start >= 22 || start < 6) {
            startValue = 'nachts';
        }

        var endValue = '';
        if (end == 0) {
            endValue = 'Mitternacht';
        }
        else if (end >= 6 && end < 12) {
            endValue = 'morgens';
        }
        else if (end == 12) {
            endValue = 'Mittag';
        }
        else if (end >= 12 && end < 15) {
            endValue = 'mittags';
        }
        else if (end >= 15 && end < 19) {
            endValue = 'nachmittags';
        }
        else if (end >= 18 && end <= 21) {
            endValue = 'abends';
        }
        else if (end >= 22 || end < 6) {
            endValue = 'nachts';
        }

        return startValue + ' - ' + endValue;
    }
}



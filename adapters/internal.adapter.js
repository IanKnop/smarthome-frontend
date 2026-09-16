/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Internal Adapter 
   
    (C) 2022 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

// ADAPTER REGISTRATION AFTER LOAD
this.addEventListener("load", function () {

    Adapters.internal = new internalAdapter();

});

function internalAdapter() {

  // COMMON ADAPTER PROPERTIES 
  this.adapterName = 'internal';

/* =========================================================
   STANDARD ADAPTER METHODS
   ========================================================= */
    internalAdapter.prototype.sendRequest   = function (requestMode, payload, senderControl = null, controlProvider = 'canvas', nextFunction = null) {

        /* sendRequest()________________________________________________________
        Gets internal adapter request                                          */
        
        // PARSE SPECIAL EXPRESSIONS
        payload = JSON.parse(this.parseExpression(JSON.stringify(payload), senderControl));

        var responseData = (payload.response != undefined ? payload.response : null);
        payload = (responseData != null ? payload.request : payload);

        switch (requestMode.toLowerCase()) {

            // VALUE: Modify value of control or variable
            case 'value':

                var requestPayload = this.setValues(payload, senderControl, responseData, nextFunction);
                if (nextFunction != null) nextFunction(requestPayload, this, (payload.keepSenderControl != undefined && payload.keepSenderControl ? senderControl : refreshControl));
                break;

            // MSG: Simple message output mainly for debugging
            case 'msg':

                SmartHomeUI.MessageBox.show(payload.message, 
                (payload.showClose != undefined ? payload.showClose : (payload.autoClose != undefined ? false : true)), 
                (payload.autoClose != undefined ? payload.autoClose : -1), function(requestAnswer) {
                    if (nextFunction != null) nextFunction(requestAnswer, this, senderControl);
                });    
                break;

            
            // HTTP: Simple http request
            case 'http':

                SmartHomeUI.InterfaceRequest.send(payload.url, (payload.payload != undefined ? payload.payload : null), function (requestAnswer) {

                    // RUN NEXT HANDLE WITH HTTP-RESPONSE
                    if ((payload.waitForResponse == undefined && payload.waitForResponse == true) && nextFunction != null) nextFunction(requestAnswer, this, refreshControl);

                }, null, 
                (payload.contentType == undefined ? URL_ENCODED : payload.contentType), 
                (payload.method == undefined ? 'GET' : payload.method),
                (payload.headers == undefined ? null : payload.headers));

                // RUN NEXT HANDLE WITHOUT WAITING FOR HTTP-RESPONSE
                if (payload.waitForResponse != undefined && payload.waitForResponse == false && nextFunction != null) nextFunction({}, this, refreshControl);
                break;

            // REFRESH
            case 'refresh':

                var delay = payload.request.delay != undefined ? payload.request.delay : 0;
                setTimeout(() => {
                    refreshStates(true); 
                    if (nextFunction != null) nextFunction(null, this, refreshControl);
                }, delay);
                break;

            // NAVIGATE: Used to navigate inside application 
            case 'navigate':

                if (payload.view != undefined) {
                    
                    SmartHomeUI.showView(payload.view, (payload.variant != undefined ? payload.variant : null));

                } else if (payload.variant != undefined) {
                    
                    SmartHomeUI.showVariant(payload.variant);

                } else if (payload.window != undefined) {

                    if (payload.close != undefined && payload.close == true) SmartHomeUI.closeWindow(payload.window);
                    else SmartHomeUI.openWindow(payload.window);

                }

                if (nextFunction != null) nextFunction(payload, this, senderControl);
                break;

            // BINDING: Used to change binding information of control
            case 'binding':
                
                var currentBinding =  document.getElementById(payload.target).getAttribute('cc-binding');
                var currentBindingInfo = AdapterBindings.filter(binding => binding.binding == currentBinding)[0];

                document.getElementById(payload.target).setAttribute('cc-binding', payload.binding); 
                refreshBindings(); refreshStates(true);
                break;

            // SCRIPT: Run JavaScript using eval (possible security issues depending on usage)
            case 'script':

                if (payload.script != undefined && payload.script != null && payload.script != '') var returnValue = eval(payload.script);
                else var returnValue = null;

                if (nextFunction != null) nextFunction(returnValue, this, senderControl);
                break;

            // STRING: Gets String by user input via screen keyboard
            case 'string':
            case 'input':
                
                SmartHomeUI.Keyboard.show(null, function(payload) { 
                    if (nextFunction != null) nextFunction(payload);
                }, payload ?? null);
                break;
        }
    }

    internalAdapter.prototype.setValues     = function (payload, senderControl, responseData) {

        /* setValues()____________________________________________________________
        Modifies one or multiple values based on internal adapter request       */

        // TRANSFORM SINGLE VALUE TO ARRAY
        if (typeof payload.target === 'string') payload.target = [payload.target];
        if (payload.update != undefined && typeof payload.update === 'string') payload.update = [payload.update];
        
        // SET RETURN VALUE TO ARRAY OR NULL
        if (payload.target.length > 1) var returnValue = []; else var returnValue = null;

        // ITERATE VALUE CHANGE REQUESTS
        for (var index = 0; index < payload.target.length; index++) {

            var mode        = payload.mode != undefined ? (Array.isArray(payload.mode) ? payload.mode[index] : payload.mode) : 'set';

            var bindingInfo = getBindingInfo(payload.target[index]);
            var value       = getBindingValue(bindingInfo);
            
            var setValue    = payload.script == undefined ? 
                                this.computeValue(payload.value != undefined ? 
                                    replaceFieldValue(Array.isArray(payload.value) ? payload.value[index] : payload.value, responseData, senderControl, Dataset) : null, bindingInfo) : eval(payload.script);

            switch (mode) {

                // VALUE SET
                case 'toggle':  
                    if (value == undefined || value == null) setValue = true; 
                    else {
                        
                        if (senderControl.getAttribute('cc-true') != undefined && senderControl.getAttribute('cc-true') != '') setValue = (value != senderControl.getAttribute('cc-true'));
                        else setValue = !toBool(value);
                    }   
                case 'set':     
                case 'merge':     
                    if (this.checkExcept(payload, setValue, index)) var newValue = setValue; 
                    else var newValue = value;
                    break;

                // CONVERT
                case 'convert':
                case 'script':

                    var newValue = eval(payload.function + '(payload);');
                    break;

                // ARRAY
                case 'array':

                    if (Dataset[payload.target] == undefined) Dataset[payload.target] = [ ];

                    if (payload.index == -1) eval('Dataset.' + payload.target + '.push(payload.payload)');
                    else eval('Dataset.' + payload.target + '[payload.index] = payload.payload;');

                    break;

                // OBJECT SET
                case 'object':

                    // MODIFY VALUE, OBJECT OR ARRAY
                    if (payload.target != undefined && payload.payload != undefined) {
                 
                        for (var targetIndex = 0; targetIndex < payload.target.length; targetIndex++) {

                            if (payload.update[targetIndex] != undefined && payload.update[targetIndex] != '' && !payload.update[targetIndex].endsWith('.')) {

                                try {
                                    // TRY TO DELETE EXISTING PROPERTY
                                    if (eval('Dataset.' + payload.update[targetIndex] + ' != undefined')) eval('delete Dataset.' + payload.update[targetIndex]);
                                } catch (e) {}
                            }  

                            eval('Dataset.' + payload.target[targetIndex] + ' = payload.payload');

                        }
                    }
                    break;
                 
                // SCROLL THROUGH VALUE ARRAY
                case 'chain':

                    var valueKeys       = JSON.parse(senderControl.getAttribute('cc-value-keys'));
                    var valueIndicators = senderControl.hasAttribute('cc-value-indicators') ? JSON.parse(senderControl.getAttribute('cc-value-indicators')) : null;

                    setValue            = value;
                    var valueIndex      = valueKeys.indexOf(value);
                    var newValue        = valueKeys[(valueIndex < valueKeys.length - 1 ? valueIndex + 1 : 0)];

                    break;

                // DELETE
                case 'delete':

                    // DELETE VALUE, OBJECT OR ARRAY
                    if (payload.target != undefined) {
                 
                        payload.target.forEach(target => {

                            if (target.includes('[')) {

                                // REMOVE FROM ARRAY
                                var targetBase      = target.substring(0, target.indexOf('['))
                                var targetIndex     = target.split('[')[1].split(']')[0];
                                eval('Dataset.' + targetBase + '.splice(' + targetIndex + ', 1);');

                            } else {

                                var targetBase      = Dataset[target.substring(0, target.indexOf('.'))];
                                var targetProperty  = target.substring(target.indexOf('.') + 1, target.indexOf('['));

                                eval('delete targetBase' + (target.substring(target.indexOf('.'))));

                            }

                        });

                    }
                    break;


                // MATH
                case 'add': 
                case 'plus': 
                case 'substract': 
                case 'minus':

                    // MATH: ADDITION / SUBSTRACTION
                    switch ((payload.valueFormat != undefined ? payload.valueFormat : 'numeric')) {

                        case 'time':

                            if (value != null) {
                                var dateValue   = new Date(); 
                                var short = (value.length == 5);

                                var newValue    = (new Date(dateValue.setHours(value.substring(0, 2), value.substring(3, 5), (short ? parseFloat(payload.mode == 'substract' || payload.mode == 'minus' ? (-1 * setValue) : setValue) : parseFloat(value.substring(6, 8)) + parseFloat(payload.mode == 'substract' || payload.mode == 'minus' ? (-1 * setValue) : setValue))))).toTimeString().substring(0, (short ? 5 : 8));
                            }
                            break;

                        case 'numeric':
                        default:

                            var additor     = setValue * (payload.mode == 'substract' || payload.mode == 'minus' ? -1 : 1);
                            var newValue    = parseFloat(bindingInfo.control.getAttribute('cc-value')) + parseFloat(additor);
                            break;
                    }
                    break;

                case 'multi': 
                case 'multiply':

                    // MATH: MULTIPLICATION
                    var newValue = parseFloat(bindingInfo.control.getAttribute('cc-value')) * parseFloat(setValue); break;

                case 'div': 
                case 'divide':

                    // MATH: DIVISION
                    var newValue = parseFloat(bindingInfo.control.getAttribute('cc-value')) / parseFloat(setValue).toPrecision(5); break;

                default:

                    if (ControlProviders[mode] != undefined) var newValue = ControlProviders[mode].setValue(payload, bindingInfo, value);
                    else var newValue = parseFloat(bindingInfo.control.getAttribute('cc-value'));

            }

            // SET CHANGE LOG
            if (payload.target.length > 1) returnValue.push( { binding: bindingInfo.binding, mode: mode, oldValue: value, newValue: newValue } );
            else returnValue = { binding: bindingInfo.binding, mode: mode, oldValue: value, newValue: newValue }; 

            // SET NEW VALUE AND UPDATE CONTROLS
            this.setValue(bindingInfo, newValue, mode);
            if (payload.avoidRefresh == undefined || payload.avoidRefresh == false) refreshControls(bindingInfo, this.adapterName);
        }   
      
        return returnValue;
    }

    internalAdapter.prototype.refreshState  = function (bindingInfo, updateTimestamp = null) {

        /* refreshState()______________________________________________________
        Provider bound refresh for internal adapter                           */


        if (bindingInfo.binding.startsWith('{[') && bindingInfo.binding.endsWith(']}')) {

            // RETURN INTERNAL EXPRESSION (i.e. current time)
            var value = this.parseExpression(getFieldName(bindingInfo.binding));
            Dataset[bindingInfo.binding] = value;

        } else {

            // INIT DATASET
            if (!bindingInfo.isPointer) this.initDataset(bindingInfo);

            // REFRESH BINDING VALUES
            if (bindingInfo.isReference) {

                // REFRESH REFERENCES IN FIXED, MIRRORED OR CONVERT MODE
                var refersTo = getBindingInfo(bindingInfo.refersTo);
                var value    = getBindingValue(refersTo);

                if (bindingInfo.isFixedValue) {

                    eval('Dataset.' + this.removePointer(bindingInfo.binding) + ' = this.parseJSON(value);');

                } else if (bindingInfo.isMirrorValue) {

                    var sourceValue = refersTo.provider == 'internal' ? eval('Dataset.' + refersTo.binding) : eval('Dataset[\'' + refersTo.binding + '\']');
                    
                    if (sourceValue == undefined) {
                        sourceValue = bindingInfo.default;
                        setPropertyTree(refersTo, Dataset, sourceValue);
                    }
                    
                    eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = sourceValue');

                } else if (bindingInfo.isTransform) {

                    var sourceValue = bindingInfo.provider == 'internal' ? eval('Dataset.' + bindingInfo.binding) : eval('Dataset[\'' + bindingInfo.binding + '\']');

                    if (eval((refersTo.binding.search(/\//g) >= 0 ? 'Dataset["' + refersTo.binding + '"]' : 'Dataset.' + refersTo.binding) + ' == undefined')) {
                        setPropertyTree(refersTo, Dataset, null);
                    }
                    
                    eval((refersTo.binding.search(/\//g) >= 0 ? 'Dataset["' + refersTo.binding + '"]' : 'Dataset.' + refersTo.binding) + ' = ' + bindingInfo.convert + '(sourceValue' + (bindingInfo.convertParams != null ? ', bindingInfo.convertParams)' : ')'));

                } else if (bindingInfo.isConvert) {

                    eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = ' + bindingInfo.convert + '(value' + (bindingInfo.convertParams != null ? ', bindingInfo.convertParams)' : ')'));
                }

            } else {

                eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = calculateBindingValue(bindingInfo, null, true)');

            }
        }

        // REFRESH CONTROLS TO SHOW NEW BINDING VALUES
        refreshControls(bindingInfo, this);
    }

    /* =========================================================
        DATA TOOLS
       ========================================================= */
    internalAdapter.prototype.initDataset = function (bindingInfo, control) {

        /* initDataset()_______________________________________________________
        Initializes dataset for given binding                                 */

        var control = bindingInfo.control;
        switch (bindingInfo.mode) {

            case 'value':
            case 'key':
                
                if (eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' == undefined') && control != undefined && control != null) {
                    eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = control.getAttribute(\'cc-value\') != null ? control.getAttribute(\'cc-value\') : (bindingInfo.default != null ? bindingInfo.default : \'\');');
                }
                break;

            case 'array':
            case 'bool':
            case 'reverse-bool':

                if (eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding)) == undefined) eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = [ ];');
                break;
        }

    }

    internalAdapter.prototype.getValue = function (bindingInfo, sourceDataset = Dataset) {

        /* getValue()____________________________________________________
        Gets current value based on dataset or control                         */

        var binding = this.removePointer(bindingInfo.binding);

        switch (bindingInfo.mode) {

            case 'value':
                return sourceDataset[binding] != undefined ? sourceDataset[binding] : (bindingInfo.control != undefined ? bindingInfo.control.getAttribute('cc-value') : '');
                
            case 'key':
                return sourceDataset[binding + '.key'];
                
            case 'range':
                return sourceDataset[binding][bindingInfo.from];
                
            case 'array':
            case 'bool':
            case 'reverse-bool':
                return sourceDataset[binding] != undefined && sourceDataset[binding][bindingInfo.arrayIndex] != undefined ? sourceDataset[binding][bindingInfo.arrayIndex] : '';

            default:
                return '';
        }
    }

    internalAdapter.prototype.setValue = function (bindingInfo, value, mode = 'value') {

        /* setValue()_____________________________________________________________
        Refreshes dataset and control state with given value                     */

        if (value != undefined && (bindingInfo.control == null || this.checkMinMax(bindingInfo.control, value))) {

            if (bindingInfo.mode == 'value') {
                
                // SINGLE VALUES
                if (mode == 'merge') {
                                    
                    var currentValue    = eval('Dataset.' + bindingInfo.binding);
                    var mergedValue     = mergeObjects(currentValue, value);

                    eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = mergedValue;');    

                } else {

                    eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = value;');
                
                }


            } else if (bindingInfo.mode == 'key') {

                // KEY VALUES
                var keyValue = JSON.parse(bindingInfo.control.getAttribute('cc-values'))[JSON.parse(bindingInfo.control.getAttribute('cc-value-keys')).indexOf(value)];

                eval('Dataset.' + this.removePointer(bindingInfo.binding) + ' = keyValue;')
                eval('Dataset.' + this.removePointer(bindingInfo.binding) + '.key = value;')

            } else {

                // ARRAYS 
                if (eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding)) == undefined || !Array.isArray(eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding)))) eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding) + ' = [ ];');

                if (bindingInfo.mode == 'range') {
                    
                    // RANGES
                    for (index = bindingInfo.from; index <= bindingInfo.to; index++) eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding))[index] = value;
                
                } else if (Array.isArray(value)) {
                    
                    // COMPLETE ARRAYS
                    eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding)) = value;

                } else {
                    
                    // SINGLE ARRAY VALUE
                    eval((bindingInfo.binding.search(/\//g) >= 0 ? 'Dataset["' + bindingInfo.binding + '"]' : 'Dataset.' + bindingInfo.binding))[bindingInfo.arrayIndex] = value;

                }
            }
        }
        
        if (bindingInfo.isReference) {

            // REFRESH REFERENCES IN FIXED, MIRRORED OR CONVERT MODE
            var refersTo = getBindingInfo(bindingInfo.refersTo);

            if (bindingInfo.isMirrorValue) {

                if (refersTo.provider == 'internal') eval('Dataset.' + refersTo.binding + ' = Dataset.' + this.removePointer(bindingInfo.binding));
                else eval('Dataset.' + refersTo.binding + ' = Dataset[' + bindingInfo.binding + ']');
            }
        }

        if (bindingInfo.control != null) {
            
            this.refreshState(bindingInfo, Date.now());
        
        }
        else if (['array', 'range', 'bool', 'reverse-bool'].includes(bindingInfo.mode)) {

            // TARGET IS ARRAY AND MIGHT AFFECT MULTIPLE CONTROLS
            AdapterBindings.filter(arrayBinding => { return arrayBinding.binding == bindingInfo.binding }).forEach(arrayItemInfo => {
                
                this.refreshState(arrayItemInfo, Date.now());

            });
        }
    }

    /* =========================================================
        CONDITION TOOLS
       ========================================================= */
    internalAdapter.prototype.checkExcept = function (payload, setValue, index) {

        /* checkExcept()__________________________________________________________
        Checks if value is NOT excepted by "unless" tag                          */

        if (payload.unless != undefined) {
            
            if (Array.isArray(payload.unless)) {

                if (payload.unless[index] != undefined && Array.isArray(payload.unless[index])) return !payload.unless[index].includes(setValue);
                else if (payload.unless[index] != undefined) return payload.unless[index] != setValue;
                else return !payload.unless.includes(setValue);
            
            } else if (typeof payload.unless === 'string' && typeof setValue === 'string') {

                return payload.unless != setValue;

            } else return false;
        }
        else return true;

    }

    internalAdapter.prototype.checkMinMax = function (control, value) {

        /* checkMinMax()________________________________________________________
        Checks if value is inside min/max definition                           */

        return !(control.hasAttribute('cc-min') && control.getAttribute('cc-min') > value || control.hasAttribute('cc-max') && control.getAttribute('cc-max') < value)
    }

    internalAdapter.prototype.checkActiveState = function (checkValue, type, trueValue = null) {

        /* checkActiveState()___________________________________________________
        Check adapter sensitive active state of device                         */

        if (trueValue != null) {

            if (trueValue.startsWith('==')) return checkValue == trueValue.substring(2);
            else if (trueValue.startsWith('===')) return checkValue.toLowerCase() == trueValue.substring(3).toLowerCase();
            else if (trueValue.startsWith('!=')) return checkValue != trueValue.substring(2);
            else if (trueValue.startsWith('<=')) return checkValue <= trueValue.substring(2);
            else if (trueValue.startsWith('>=')) return checkValue >= trueValue.substring(2);
            else if (trueValue.startsWith('<')) return checkValue < trueValue.substring(1);
            else if (trueValue.startsWith('>')) return checkValue > trueValue.substring(1);
            else return decodeURIComponent(checkValue) == decodeURIComponent(trueValue);

        } else if (checkValue.state != undefined) {
            
            return (checkValue.state.toLowerCase() == 'on');
        
        } else return toBool(checkValue);

    }

    /* =========================================================
        OTHER TOOLS
       ========================================================= */
    internalAdapter.prototype.parseJSON = function(value) {

        try { 

            value = JSON.parse(value); 
            
        } catch(e) { 

            // NO JSON

        } finally {

            return value;

        }
    }

    internalAdapter.prototype.removePointer = function(binding) {

        return binding.startsWith('*') ? binding.substr(1) : binding;

    }

    internalAdapter.prototype.computeValue = function (setValue, bindingInfo) {

        /* computeValue()______________________________________________________
        Parses set value which can be single or array value                    */

        if (setValue == null) return null;
        else if (['array', 'bool', 'reverse-bool'].includes(bindingInfo.mode) && setValue.includes(bindingInfo.arrayIndex)) {
        
            var returnValue = [];
            switch (bindingInfo.mode) {

                case 'bool':
                case 'reverse-bool':
                    setValue.split(bindingInfo.arrayIndex).forEach(index => { returnValue[index] = (bindingInfo.mode == 'bool'); });
                    break;
                    
                default:
                    if (!isNaN(bindingInfo.arrayIndex)) returnValue = setValue.split(bindingInfo.arrayIndex);
                    break;
            }

            return returnValue;

        } else return setValue;
    }

    internalAdapter.prototype.handleResponse = function (responseMode, response, payload, refreshControl) {

        /* handleResponse()_____________________________________________________
        Handles adapter based call-responses                                   */

        switch (responseMode.toLowerCase()) {

            case 'msg':

                if (payload.message != null) alert(payload.message);
                break;
        }
    }

    internalAdapter.prototype.parseExpression = function (subject, senderControl = null) {

        /* parseExpression()____________________________________________________
        Parses text with standard expressions (i.e. date, time)                */

        var returnValue = subject;

        // CURRENT DATE LONG
        var currentDateLong = (new Date()).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) ;
        [ '{[CURRENT_DATE_LONG]}', '[[CURRENT_DATE_LONG]]', 'CURRENT_DATE_LONG' ].forEach(pattern => {
            returnValue = returnValue.replaceAll(pattern, currentDateLong);
        });

        // CURRENT TIME
        var currentTime = (new Date()).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) ;
        [ '{[CURRENT_TIME]}', '[[CURRENT_TIME]]', 'CURRENT_TIME' ].forEach(pattern => {
            returnValue = returnValue.replaceAll(pattern, currentTime);
        });

        // PARSE FIELD VALUES
        while (returnValue.indexOf('{(') > -1) {
            var pattern = returnValue.substring(returnValue.indexOf('{('), returnValue.indexOf(')}') + 2);
            var field   = getFieldName(pattern)

            returnValue = returnValue.replaceAll(pattern, eval('Dataset.' + field));
        }

        // SENDER VALUE
        if (senderControl != null) {
            
            try {           
                var senderValue = senderControl.hasAttribute('cc-value') ? senderControl.getAttribute('cc-value') : senderControl.value;
                if (senderValue != undefined && senderValue != null) [ '{[SENDER_VALUE]}', '[[SENDER_VALUE]]', 'SENDER_VALUE' ].forEach(pattern => {
                    returnValue = returnValue.replaceAll(pattern, senderValue);
                });
            } catch (error) {

                // CONTROL HAS NO VALUE ATTRIBUTE

            }
            
        }

        return returnValue;
       
    }
}

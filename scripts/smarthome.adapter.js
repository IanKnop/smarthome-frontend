/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Adapter Bindings

    (C) 2021 by Ian Knop, Weiterstadt, Germany
    https://github.com/IanKnop/SmartHomeUI/
    ========================================================= */

/* =========================================================
    API - LISTENER
   ========================================================= */

// SETTING CONSTANTS
const REFRESH_FREQUENCY         = 500;  // 1000 = 1 Second
const DATA_REFRESH_FREQUENCY    = 10;   // 10   = get updated data every tenth refresh iteration (above) 

const DEFAULT_ADAPTER           = 'internal';
const NUMBER_FORMAT             = 'EU';

// GLOBAL PROPERTIES
var Adapters                    = {};
var AdapterBindings             = [];
var ConditionalControls         = [];
var Dataset                     = {};

var parsedReferences            = [];

var refreshAdapterThread        = null;
var updateIteration             = -1;

var pauseRefeshState            = false;

/* =========================================================
    INITIALIZATION
   ========================================================= */
this.addEventListener("load", function () {

    /* Event: onload___________________________________________________________
    Create array of all controls that have to be updated                     */

    // READ ALL BINDINGS
    refreshBindings();

    // REFRESH STATE ONCE AND THEN AS {REFRESH_FREQUENCY} INTERVAL (in refreshStates() function)
    refreshStates(false, false);

});

/* =========================================================
    ADAPTER METHODS
   ========================================================= */
function refreshBindings() {

    AdapterBindings = [];
    document.body.querySelectorAll('[cc-update="true"],[cc-conditions]').forEach(control => {

        // READ ALL CONTROL BINDINGS
        [ 'cc-binding', 'cc-data-binding', 'cc-ref' ].forEach(bindingType => {

            if (control.getAttribute(bindingType) != null && control.getAttribute(bindingType).trim() != '') {
            
                var binding = control.getAttribute(bindingType);
                //if (binding.includes('{[')) binding = binding.substring(binding.indexOf('{[') + 2, binding.indexOf(']}'));

                if (!binding.startsWith('*') &&
                   (bindingType != 'cc-binding' ||
                   (bindingType == 'cc-binding' && !control.hasAttribute('cc-ref')) ||
                   (bindingType == 'cc-binding' && control.hasAttribute('cc-ref') && control.getAttribute('cc-provider') != 'internal'))) {

                    // GET BINDING INFO
                    var bindingInfo = getBindingInfo(binding, true, bindingType);

                    // GET DELAYED
                    if (control.hasAttribute('cc-binding-delay')) bindingInfo.bindingDelay = toBool(control.getAttribute('cc-binding-delay'));

                    if (AdapterBindings.filter(adapter => (adapter.binding == bindingInfo.binding && adapter.provider == bindingInfo.provider)).length == 0) {
                        
                        if (bindingInfo.provider != 'internal' || !bindingInfo.binding.includes('.')) AdapterBindings.push(bindingInfo)

                    }
                        
                }
            }
        });
        
        // CONTROLS WITH CONDITION BINDINGS
        if (control.getAttribute('cc-conditions') != null && control.getAttribute('cc-conditions').trim != '') {
            
            ConditionalControls.push({ id: control.id, conditions: control.getAttribute('cc-conditions'), style: control.style });
            getConditionBindings(control.getAttribute('cc-conditions')).forEach(binding => {
    
                if (AdapterBindings.filter(adapter => (adapter.binding == binding.binding && adapter.provider == binding.provider)).length == 0) 
                    AdapterBindings.push(binding)
    
            });
        }

    });

}

function sendRequest(adapter, requestMode, payload, refreshControl = null, sound = '', controlProvider = 'canvas', nextFunction = null) {

    /* sendRequest()_______________________________________________________
    Sends request to specified adapter                                    */

    if (adapter == null || adapter == '') adapter = DEFAULT_ADAPTER;

    // PLAY SOUND
    if (sound != '') SmartHomeUI.Audio.playSound(sound.toUpperCase());

    // REPLACE FIELD VALUES
    replaceFieldValues(payload, (payload.response != undefined ? payload.response : null), refreshControl);
    
    // CALL ADAPTER BASED REQUEST HANDLING
    if (Adapters[adapter] != undefined) Adapters[adapter].sendRequest(requestMode, payload, refreshControl, controlProvider, nextFunction);
    if (ControlProviders[adapter] != undefined) ControlProviders[adapter].sendRequest(requestMode, payload, refreshControl, controlProvider, nextFunction);

    refreshStates(true);
}

function sendDefaultRequest(requestMode, payload, refreshControl = null, sound = '', controlProvider = 'canvas', nextFunction = null) {

    /* sendDefaultRequest()________________________________________________
    Sends request to default adapter                                      */

    sendRequest(DEFAULT_ADAPTER, requestMode, payload, refreshControl, sound, controlProvider, nextFunction);

}

function handleResponse(adapter, responseMode, response, payload = null, refreshControl = null) {

    /* handleResponse()____________________________________________________
    Handles adapter based call-responses                                  */

    if (adapter == null || adapter == '') adapter = DEFAULT_ADAPTER;

    replaceFieldValues(payload, response, refreshControl);
    Adapters[adapter].handleResponse(responseMode, response, payload, refreshControl);

}

/* =========================================================
    ADAPTER DATA
   ========================================================= */
function refreshStates(force = false, once = false, adapter = null) {

    /* refreshStates()________________________________________________________
    Frequently refreshes states of elements based on interface values        */

    if (force) clearTimeout(refreshAdapterThread);
    if ((!pauseRefeshState || force) && (AdapterBindings != [] || ConditionalControls != [])) {

        // STANDARD ADAPTER DATA POINTS
        if (force || updateIteration == -1 || updateIteration == DATA_REFRESH_FREQUENCY) {

            // REFRESH DATA OF ADAPTER BINDINGS AND ANY RELATED CONTROLS (i.e. ioBroker, Node-RED)
            var refreshTimestamp = Date.now();

            AdapterBindings.forEach(function (bindingInfo) {

                if (!hasProvider(bindingInfo)) bindingInfo.provider = DEFAULT_ADAPTER;
                if (adapter == null || bindingInfo.provider == adapter) 
                    Adapters[bindingInfo.provider].refreshState(bindingInfo, refreshTimestamp, force);
            });

            // CONDITIONAL CONTROL BEHAVIOUR
            refreshConditionControls();
            updateIteration = 0;

        } else {

            updateIteration++;
        }
    }

    if (!once) {
        refreshAdapterThread = setTimeout(refreshStates, REFRESH_FREQUENCY);
    }
}

function refreshConditionControls() {

    /* refreshConditionControls()_____________________________________________
    Refreshes all conditional controls (i.e. dynamically visible)            */

    ConditionalControls.forEach(function (control) {

        // CHECK AND APPLY CONDITIONS
        var control = document.getElementById(control.id);
        if (control.hasAttribute('cc-conditions') && control.getAttribute('cc-conditions').trim() != '') {
            applyCondition(control, JSON.parse(urlDecode(control.getAttribute('cc-conditions'))));
        }
        
        //console.log('Controls: Re-Check and apply conditions for ' + control.id);
    });
}

function hasProvider(bindingInfo) {

    /* hasProvider()________________________________________________________
    Returns if binding information includes provider                         */

    return !(bindingInfo.provider == undefined || bindingInfo.provider == null || bindingInfo.provider == 'null' || bindingInfo.provider == '')

}

function updateDataset(refreshData, parentObject = '', sender = '') {

    /* updateDataset()________________________________________________________
    Updates datapoint and values in global dataset object                   */

    parentObject += (parentObject != '' && !parentObject.endsWith('.') ? '.' : '');
    if (!Array.isArray(refreshData) && typeof refreshData === 'object') {

        Object.keys(refreshData).forEach(key => {

            var bindingId   = (parentObject + key); 
            var bindingInfo = getBindingInfo(bindingId);

            // UPDATE VALUE IN GLOBAL DATASET
            if (bindingInfo.computed) {
                
                // DIRECT VALUE
                if (bindingInfo.provider == 'internal' && bindingInfo.mode != 'expression') eval('Dataset.' + bindingId + ' = refreshData[key];');
                else Dataset[bindingId] = refreshData[key];

                // REFERENCES
                if (bindingInfo.isReference) setReferenceValue(bindingInfo, refreshData[key]);

                // REFERENCE SOURCES
                if (bindingInfo.isReferenceSource) updateReferenceTargets(refreshData[key], bindingInfo);
           }

        });

        //console.log('Global Dataset: Updated ' + Object.keys(refreshData).length + ' Items for ' + sender);
    }
}

function updateReferenceTargets(refreshDataItem, bindingInfo) {

    /* updateReferenceTargets()______________________________________________
    Update references                                                       */

    var bindingId = bindingInfo.binding; 
    getReferenceBindings(bindingInfo).forEach(reference => {
    
        var refKey = reference.binding + '#' + bindingId;
        if (reference.referMode == 'initial' && !parsedReferences.includes(refKey)) {

            // INITIAL REFERENCES ARE ONLY COPIED ONCE AND ARE NOT UPDATED WITH THE SOURCE VALUE
            parsedReferences = parsedReferences.filter(parsedRef => !parsedRef.startsWith(reference.binding + '#'));
            parsedReferences.push(refKey);
            setReferenceValue(reference, refreshDataItem);

        } else if (reference.referMode == 'value') {
            
            // SIMPLE COPY OF DATA-VALUE OF GIVEN BINDING
            setReferenceValue(reference, getBindingData(getBindingInfo(reference.refersTo)));
            refreshControl(getControlInfo(reference.control), getAdapterFromString(reference.provider));

        }
    }); 
}  

function setReferenceValue(referenceBinding, refreshDataItem = null, force = false) {

    /* setReferenceValue()_______________________________________________
    Sets data value of reference                                        */

    if (referenceBinding.isConvert) {
            
        eval('Dataset.' + referenceBinding.binding) = getBindingValue(getBindingInfo(referenceBinding.refersTo));
    
    } else {
        
        var referBindingInfo    = getBindingInfo(referenceBinding.refersTo);
        var reverseCalcValue    = calculateBindingValue(referBindingInfo, refreshDataItem, true);

        if (typeof reverseCalcValue !== 'string' || reverseCalcValue != '' || force) setBindingData(referBindingInfo, reverseCalcValue);
    }

}

function getAdapterBinding(bindingId) {

    var findAdapterBinding = AdapterBindings.filter(binding => { if (binding.bindingSource == bindingId) return true; });

    if (findAdapterBinding.length > 0) return findAdapterBinding[0];
    else return undefined;

}

function getAdapterFromString(adapterName) {

    /* getAdapterFromString()____________________________________________
    Sets data value of reference                                        */

    if (Adapters[adapterName] != undefined) return Adapters[adapterName]; 
    else return Adapters.internal;
    
}

/* =========================================================
    BINDING OBJECT
   ========================================================= */
function getBindingInfo(binding, refresh = false, bindingTag = 'cc-binding') {

    /* getBindingInfo()_____________________________________________________
    Gets target information values as object                               */

    var cachedBinding = getAdapterBinding(binding);

    if (!refresh && cachedBinding != undefined) {

        // GET BINDING INFO FROM CACHE
        return cachedBinding;

    } else {

        // GET BINDING INFO FROM HTML DOCUMENT
        var returnObject = getBindingObject(binding, bindingTag);

        returnObject.computed = true;
        if (binding.startsWith('{[') || binding.startsWith('{{[')) {
            
            // STANDARD EXPRESSIONS
            returnObject.mode = binding.startsWith('{{[') ? 'field' : 'expression';

        } else if (binding.includes('[[')) {
            
            // PART OF BINDING IS STORED IN INTERNAL VARIABLE
            var reference = binding.substring(binding.indexOf('[[') + 2, binding.indexOf(']]'));
        
            if (Adapters.internal.dataset[reference] != undefined) {
                returnObject.binding = binding.replace('[[' + reference + ']]', Adapters.internal.dataset[reference]);
            } else {
                returnObject.computed = false;
            }
        
        } else if (binding.includes('[')) {

            // BINDING IS TARGETING AN ARRAY
            returnObject.isArray = true;
            setBindingArrayInfo(returnObject, binding);

        } else {

            // SINGLE VALUE OR KEY 
            // returnObject.mode = (returnObject.controls != null && returnObject.control.hasAttribute('cc-value-key')) ? 'key' : 'value';
        }

    }   

    return returnObject;
}

function getBindingObject(binding, bindingTag) {

    /* getBindingObject()_____________________________________________________
    Returns new binding info object                                          */

    //var bindingTag = (dataBinding ? 'cc-data-binding' : 'cc-binding');
    var bindingProviderTag = (bindingTag == 'cc-data-binding' ? 'cc-data-provider' : 'cc-provider');

    // INITIALIZE BINDING OBJECT
    var bindingObject = initBindingObject(binding);

    if (binding.startsWith('*')) bindingObject.isPointer = true;
    else bindingObject.isPointer = false;
    
    // GET BINDING CONTROLS
    getBindingControls(bindingObject, bindingTag);
    
    if (!bindingObject.isReference) {
     
        bindingObject.provider          = (bindingObject.control != null ? bindingObject.control.getAttribute(bindingProviderTag) : null);
        
        bindingObject.isDataBinding     = bindingTag == 'cc-data-binding';
        bindingObject.isConvert         = false;
        bindingObject.isMirrorValue     = false;
        bindingObject.isFixedValue      = false;
    
    }
    else {

        // REFERENCE INFORMATION
        bindingObject.provider          = 'internal'; 

        setBindingReferenceInfo(bindingObject);
    }

    return bindingObject;
}

function initBindingObject(binding) {

    /* initBindingObject()____________________________________________________
    Initializies new binding object                                          */

    return {

        bindingSource: binding,
        mathFunction: (binding.includes('|') ? binding.substr(binding.indexOf('|') + 1, 1) : null),
        mathValue: (binding.includes('|') ? binding.substr(binding.indexOf('|') + 2) : null),

        binding: (binding.includes('|') ? binding.substring(0, binding.indexOf('|')) : binding),
        convert: null,

        isArray: false,
        mode: 'value'
    };
}

function getBindingControls(bindingObject, bindingTag = 'cc-binding') {

    /* getBindingControls()___________________________________________________
    Return list of controls with given binding                               */

    var binding         = bindingObject.binding;
    var bindingControls = null;

    if (binding.includes('[')) {

        // FIND ARRAY CONTROLS
        bindingControls     = document.body.querySelectorAll('[' + bindingTag + '^="' + binding.substring(0, binding.indexOf('[')) + '"]');

    } else if (bindingTag == 'cc-ref') {

        bindingControls     = getRefControls(binding);

    } else {

        // FIND NON-ARRAY CONTROLS INCLUDING RELATIVE RELATIONS
        var refControls     = getIndirectRefControls(binding, bindingTag);
        var findControls    = Array.from(document.body.querySelectorAll('[' + bindingTag + '="' + binding + '"]' + ',' + '[cc-highlight-value="{[' + binding + ']}"],[cc-highlight-source="{[' + binding + ']}"]'));
        var findSimilar     = Array.from(document.body.querySelectorAll('[' + bindingTag + '^="' + binding + '"]'));

        bindingControls     = [...new Set([...(findControls.length > 0 ? findControls : findSimilar), ...refControls])]
        //(findControls.length > 0 ? findControls : findSimilar);
    }

    // SAVE CONTROL INFORMATION
    setBindingControlInfo(bindingObject, bindingControls);
    
    // SET REFERENCE STATE
    if (bindingTag == 'cc-ref') bindingObject.isReference = true;
    else bindingObject.isReference = false;

    bindingObject.isReferenceSource = (bindingObject.control != null && bindingObject.control.hasAttribute('cc-ref') && (bindingObject.control.getAttribute('cc-binding') == binding || bindingObject.control.getAttribute('cc-binding').startsWith(binding + '.')));
    bindingObject.default           = (bindingObject.control != null && bindingObject.control.hasAttribute('cc-default') ? bindingObject.control.getAttribute('cc-default') : null); 

}

function getIndirectRefControls(binding, bindingTag = 'cc-binding') {

    /* getIndirectRefControls()______________________________________________________
    Gets controls, that are linked to a binding through a reference. This could be
    the case, when a reference holds a SQL statement in which a binding-variable is
    used (i.e. as filter).                                                          */

    try {
        var refControls = [ ];
        var refArray    = Array.from(document.body.querySelectorAll('[cc-binding*="{(' + binding + ')}"]'));

        if (refArray.length > 0) {
            var referenceBindings = [...new Set(refArray.map(item => item.getAttribute('cc-ref')))];
            referenceBindings.forEach(refBinding => {
                var refBindingControls = document.body.querySelectorAll('[' + bindingTag + '="' + refBinding + '"]');
                refBindingControls.forEach(bindingControl => { if (!refControls.includes(bindingControl)) refControls.push(bindingControl); });   
            });
        }

        return refControls;

    } catch (err) {

        return [ ];

    }

}

function getRefControls(binding, includeReference = true) {

    /* getRefControls()______________________________________________________
    Sets control information for binding                                    */

    //return document.body.querySelectorAll((includeReference ? '[cc-ref="' + binding + '"],' : '') + '[cc-binding="*' + binding + '"], [cc-data-binding="*' + binding + '"]');
    return document.body.querySelectorAll((includeReference ? '[cc-ref="' + binding + '"],' : '') + '[cc-binding="' + binding + '"]:not(reference)');

}

function setBindingControlInfo(bindingObject, bindingControls) {

    /* setBindingControlInfo()_______________________________________________
    Sets control information for binding                                    */

    bindingObject.controls          = bindingControls;
    bindingObject.control           = (bindingObject.controls != null ? bindingObject.controls[0] : null);
    bindingObject.controlProvider   = (bindingObject.control != null ? bindingObject.control.getAttribute('cc-control-provider') : '');
    bindingObject.hasControl        = (bindingObject.control != null);

}

function setBindingReferenceInfo(bindingObject) {

    /* setBindingReferenceInfo()_____________________________________________
    Sets reference information for binding                                  */

    var refControl                  = document.body.querySelectorAll('reference[cc-ref="' + bindingObject.binding + '"]') != null ? document.body.querySelectorAll('reference[cc-ref="' + bindingObject.binding + '"]')[0] : null;
    
    bindingObject.referMode         = bindingObject.control.hasAttribute('cc-ref-mode') ? bindingObject.control.getAttribute('cc-ref-mode') : 'value';
    bindingObject.refersTo          = (refControl != null ? refControl.getAttribute('cc-binding') : null); 
    bindingObject.convert           = (refControl != null && refControl.hasAttribute('cc-convert') && !bindingObject.isReferenceSource) ? refControl.getAttribute('cc-convert') : '';
    bindingObject.convertParams     = (refControl != null && refControl.hasAttribute('cc-convert-params') && !bindingObject.isReferenceSource) ? JSON.parse(refControl.getAttribute('cc-convert-params')) : null;
    bindingObject.isConvert         = bindingObject.control.getAttribute('cc-ref-mode') == 'convert';
    bindingObject.isTransform       = bindingObject.control.getAttribute('cc-ref-mode') == 'transform';
    bindingObject.isMirrorValue     = bindingObject.control.getAttribute('cc-ref-mode') == 'mirror';
    bindingObject.isFixedValue      = bindingObject.control.getAttribute('cc-ref-mode') == 'fixed';

}

function getReferenceBindings(bindingInfo) {

    /* getReferenceBindings()_______________________________________________
    Gets all bindings that are references                                  */

    return AdapterBindings.filter(binding => {
                    
        if (binding.refersTo != null) {
        
            //var referBindingId = getBindingInfo(binding.refersTo).binding;
            var referBindingId = binding.refersTo;
            var referBase = (referBindingId.includes('.') ? referBindingId.substr(0, referBindingId.indexOf('.')) : referBindingId);

            if (referBase == bindingInfo.bindingSource) return true;
            else return false;
        
        } else return false;
    
    });

}

function getControlInfo(control) {

    /* getBindingInfo()_____________________________________________________
    Gets target information values as object                               */

    return { 
        id:             control.id, 
        binding:        control.getAttribute('cc-binding'), 
        provider:       getDataProvider(control), 
        dataprovider:   control.getAttribute('cc-data-provider'), 
        value:          control.getAttribute('cc-value'), 
        control:        control 
    }

}

function setBindingArrayInfo(returnObject, binding) {

    /* setBindingArrayInfo()__________________________________________________
    Sets array specific binding information                                  */

    returnObject.binding = binding.substring(0, binding.indexOf('['));
    returnObject.arrayIndex = binding.substring(binding.indexOf('[') + 1, binding.indexOf(']'));
        
    if (!isNaN(returnObject.arrayIndex)) {

        // STANDARD ARRAY
        returnObject.mode = 'array';

    } else if (returnObject.arrayIndex.startsWith('?') || returnObject.arrayIndex.startsWith('!')) {

        // BOOL OR REVERSE-BOOL ARRAY METHOD
        returnObject.mode = returnObject.arrayIndex.startsWith('?') ? 'bool' : 'reverse-bool';

        returnObject.arrayIndex = returnObject.arrayIndex.substring(1);

    } else if (returnObject.arrayIndex.includes('-')) {

        // ARRAY RANGE METHOD
        returnObject.mode = 'range';

        returnObject.from = returnObject.arrayIndex.substring(0, returnObject.arrayIndex.indexOf('-'));
        returnObject.to = returnObject.arrayIndex.substring(returnObject.arrayIndex.indexOf('-') + 1);
    }

    returnObject.arrayId = returnObject.binding + '[' + returnObject.arrayIndex + ']';
    
}

/* =========================================================
    BINDING VALUES
   ========================================================= */
function getBindingValue(bindingInfo, reverse = false, thisDataset = Dataset) {

    /* getBindingValue()______________________________________________________
    Returns binding value based on given binding id and dataset              */

    var bindValue = null;
    var bindingId = (bindingInfo.isArray ? bindingInfo.arrayId : bindingInfo.binding);

    if (bindingInfo.isReference) {

        // REFERENCES OTHER BINDING
        if (bindingInfo.referMode == 'fixed' || bindingInfo.referMode == 'transform') {
            
            var bindValue = eval('Dataset.' + bindingId);
            
        } else {

            var bindValue = getBindingValue(getBindingInfo(bindingInfo.refersTo), reverse, thisDataset);

        }

    } else if (bindingInfo.mode == 'http') {

        var bindValue = 'XXX';

    } else if (bindingId == null || bindingId == '' || bindingId == '#') {

        // RETURN VALUE FROM "cc-value"-ATTRIBUTE INSTEAD OF DATASET
        var bindValue = (bindingInfo.hasControl ? bindingInfo.control.getAttribute('cc-value') : null);

    }
    else if (bindingId.startsWith('{[')) {

        // RETURN STANDARD EXPRESSIONS ARE ALWAYAS COMPUTED LIVE
        var bindValue = Adapters.internal.parseExpression(bindingId);
        bindValue = calculateBindingValue(bindingInfo, null, reverse, thisDataset);
    }
    else if (bindingId.includes('[') && !bindingId.startsWith('{[')) {

        // RETURN SINGLE ARRAY VALUE
        var arrayName = bindingId.substring(0, bindingId.indexOf('['));
        var arrayIndex = bindingId.substring(bindingId.indexOf('[') + 1, bindingId.indexOf(']'));

        if (thisDataset[arrayName] != undefined && thisDataset[arrayName][arrayIndex] != undefined) var bindValue = thisDataset[arrayName][arrayIndex];
        else if (bindingInfo.mode == 'bool' || bindingInfo.mode == 'reverse-bool') var bindValue = (bindingInfo.mode != 'bool');

    } else if (bindingId.startsWith('*')) {

        // POINTER TO BINDING
        var bindValue = getBindingValue(getBindingInfo(bindingInfo.bindingSource.substr(1)), false, thisDataset);
        
    } else {

        // RETURN COMPLETE OBJECT
        var bindValue = calculateBindingValue(bindingInfo, null, reverse, thisDataset);
    }

    if (bindingInfo.convert != null && bindingInfo.convert != '' && bindingInfo.isTransform == false) {
        return eval(bindingInfo.convert + '(bindValue, bindingInfo.convertParams, bindingInfo)');
    }
    else return bindValue;
}

function calculateBindingValue(bindingInfo, fixValue = null, reverse = false, thisDataset = Dataset) {

    /* calculateBindingValue()_____________________________________________
    If Binding has math function attached value is returned calculated.   */

    var bindingData = (fixValue != null ? fixValue : (bindingInfo.isReference ? getBindingValue(bindingInfo, reverse, thisDataset) : getBindingData(bindingInfo, thisDataset)));

    if (bindingInfo.mathFunction != null) return calculateValue(getFunction(bindingInfo, reverse), bindingInfo.mathValue, bindingData);
    else return bindingData;

}

function calculateValue(mathFunction, mathValue, bindingData) {

    /* calculateValue()____________________________________________________
    Calculates value from binding data                                    */

    
    if (['+', '-', '*', '/', '%', '$', '§', '#'].includes(mathFunction)) switch (mathFunction) {

        // SIMPLE MATH FUNCTIONS
        case '+':   if (!isNaN(bindingData)) return parseFloat(bindingData) + parseFloat(mathValue);
        case '-':   if (!isNaN(bindingData)) return parseFloat(bindingData) - parseFloat(mathValue);
        case '*':   if (!isNaN(bindingData)) return parseFloat(bindingData) * parseFloat(mathValue);
        case '/':   if (!isNaN(bindingData)) return parseFloat(bindingData) / parseFloat(mathValue);
        case '%':   if (!isNaN(bindingData)) return parseFloat(bindingData) % parseFloat(mathValue);

        // VALUE REPLACEMENT 
        case '$':
        case '§':   return replaceStringFunction(mathFunction, mathValue, bindingData);

        // CONVERT FUNCTION
        case '#':   return eval(mathFunction + '(bindingData);');
    
    } else {

        return bindingData;

    }

}

function replaceStringFunction(mathFunction, mathValue, bindingData) {

    /* replaceStringFunction()______________________________________________
    Replaces search string with given parameter                            */

    var replaceArray = [];
    var returnValue  = bindingData;
    var reverse      = (mathFunction == '§');

    var reParse = false;
    if (returnValue != undefined) {

        if (typeof returnValue === 'object') {
            
            returnValue = JSON.stringify(returnValue);
            reParse = true;

        }
        else returnValue = returnValue.toString();
        
        mathValue.split(';').forEach(bindingPair => replaceArray.push({ search: bindingPair.split('=')[(reverse ? 1 : 0)], value: bindingPair.split('=')[(reverse ? 0 : 1)] }));
        replaceArray.forEach(replacement => returnValue = returnValue.replace(new RegExp(replacement.search, "g"), replacement.value));

    }

    if (reParse) returnValue = JSON.parse(returnValue);
    return returnValue;

}

function getFunction(bindingInfo, reverse = false) {

    /* getFunction()________________________________________________________
    Gets operator or its opposite (in reverse mode)                        */

    var cv = bindingInfo.mathFunction;
    
    if (!reverse) return bindingInfo.mathFunction;
    
    var mathFunction = bindingInfo.mathFunction;
    
    if (reverse) var mathFunction = (cv == '$' ? '§' : (cv == '+' ? '-' : (cv == '-' ? '+' : 
                                    (cv == '/' ? '*' : (cv == ':' ? '*' : (cv == '*' ? '/' : cv))))));

    return mathFunction;

}

function replaceFieldValues(sourceObject, responseDataset = null, sourceControl = null, thisDataset = Dataset, includeHandles = false) {

    /* replaceFieldValues()___________________________________________________
    Replaces values for given field names in (payload)-object                */

    if (thisDataset == null) thisDataset = Dataset;
    if (typeof sourceObject === 'string') return replaceFieldValue(sourceObject, responseDataset, sourceControl, thisDataset);
    else {
        
        try {
            Object.keys(sourceObject).forEach(key => {

                if (typeof sourceObject[key] != 'string' && sourceObject[key] != null) {
                  
                    if (includeHandles || key != 'handle' || (sourceObject[key].keepResponse != undefined && sourceObject[key].keepResponse))
                        replaceFieldValues(sourceObject[key], responseDataset, sourceControl, thisDataset);
                    else if (sourceObject[key].handle != undefined) 
                        replaceFieldValues(sourceObject[key].handle, responseDataset, sourceControl, thisDataset)
                
                } else if (typeof sourceObject[key] === 'string') {
                  
                    sourceObject[key] = replaceFieldValue(sourceObject[key], responseDataset, sourceControl, thisDataset);
                }
        
            });
        } catch (err) {
            // ERROR
        }
    }
    
}

function getParentElement(senderElement, searchTag) {

    /* getParentElement()____________________________________________________
    Returns first parent element of type 'searchTag'                        */

    var checkElement = senderElement.parentElement;

    while (checkElement != undefined && checkElement != null)  {

        if (checkElement.tagName.toLowerCase() == searchTag.toLowerCase()) return checkElement;
        else checkElement = checkElement.parentElement;

    }

    return null;

}

function parseFieldValues(value, responseDataset = null, sourceControl = null, thisDataset = Dataset, includeHandles = false) {

    var newValue = JSON.parse(JSON.stringify(value));
    replaceFieldValues(newValue, responseDataset, sourceControl, thisDataset, includeHandles);

    return newValue;
}

function replaceFieldValue(value, responseDataset = null, sourceControl = null, thisDataset = Dataset) {

    /* replaceFieldValue()___________________________________________________
    Replaces field variables in given string value                          */

    if (typeof value === 'string') {

        // COMPLETE RESPONSE
        if (value.includes('{response}') && responseDataset != null) {
            
            value = value.replace('{response}', (typeof responseDataset === 'string' ? responseDataset : JSON.stringify(responseDataset)));
        
        } else if (value.includes('{response}') && sourceControl != null && sourceControl.hasAttribute('cc-value')) {
            
            value = value.replace('{response}', sourceControl.getAttribute('cc-value'));

        } else if (value.includes('{value}') && sourceControl != null) {
            
            try {
                
                if (sourceControl.getAttribute('cc-value') != undefined && sourceControl.getAttribute('cc-value') != null) {
                    value = value.replace('{value}', sourceControl.getAttribute('cc-value'));
                }
                else if (sourceControl.value != undefined && sourceControl.value != null) {
                    value = value.replace('{value}', sourceControl.value);
                }
                else {
                    value = '';
                }

            } catch (err) {

            }
        }

        // TABLE ROW FIELDS
        if (value.includes('{row') && sourceControl != null) {
        
            while (value.includes('{row')) { 
                if (getParentElement(sourceControl, 'tr') != null) {

                    var rowData = JSON.parse(getParentElement(sourceControl, 'tr').getAttribute('cc-data'));

                    if (value == '{row}' && sourceControl != null) value = rowData;
                    else if (value.includes('{row.') && sourceControl != null) {
                    
                        var propertyId = value.substring(value.indexOf('{row.') + 5, value.indexOf('}', value.indexOf('{row.')));
                        value = value.replace('{row.' + propertyId + '}', rowData[propertyId]);
                    }
                }
            }
        }

        // RESPONSE FIELDS
        var lastPosition = 0;
        while ((typeof value != 'object') && value.indexOf('{response.', lastPosition) != - 1) {

            var propertyId = value.substring(value.indexOf('{response.') + 10, value.indexOf('}', value.indexOf('{response.')));
            
            lastPosition = value.indexOf('{response.') + 1;
            if (responseDataset != null) {

                var responseObject = (responseDataset.response != undefined ? responseDataset.response : responseDataset);
                if (responseObject[propertyId] != undefined) {

                    if (typeof responseObject[propertyId] === 'object') value = responseObject[propertyId];
                    else value = value.replace('{response.' + propertyId + '}', responseObject[propertyId]);
                    
                } else {

                    value = value.replace('{response.' + propertyId + '}', '');

                }
            }
        }

        // STANDARD FIELDS
        var fieldPrefixes = [ '{[', '{(', '{{' ];
        var fieldSuffixes = [ ']}', ')}', '}}' ];

        for (var index = 0; index < fieldPrefixes.length; index++) {

            while ((typeof value != 'object') && value.includes(fieldPrefixes[index]) && value.includes(fieldSuffixes[index])) {

                var fieldName   = (value.substring(value.indexOf(fieldPrefixes[index]) + 2, value.indexOf(fieldSuffixes[index], value.indexOf(fieldPrefixes[index]))));
                
                // REMOVE ARRAY IDENTIFIER IN FIELD NAME IF PRESENT
                var plainField  = fieldName.split('|')[0];
                
                // SPEICAL CASE MULTI-VALUE ARRAYS ('[?n]')
                if (fieldName.includes('[') && !fieldName.includes('[?')) var fieldId = fieldName.split('|')[0];
                else var fieldId = fieldName.split('|')[0].split('[')[0];

                var base        = fieldName.split('.')[0];
                var binding     = getBindingInfo(base);

                if (binding.binding.includes('::')) {
                    
                    value = replaceAdapterFieldValue(value, responseDataset, sourceControl, thisDataset);

                }
                else {

                    if (binding.provider == 'internal') var source = eval('Dataset.' + fieldId);
                    else var source = eval('Dataset[\'' + fieldId + '\']');

                    if (source != undefined && (typeof source === 'string' || typeof source === 'number' || typeof source === 'boolean')) {

                        var replaceValue = calculateBindingValue(binding);
                        if (fieldName.includes('.')) var replaceValue = eval('replaceValue.' + fieldName.split('.').slice(1).join('.'));

                        value = value.replace(fieldPrefixes[index] + fieldName + fieldSuffixes[index], replaceValue);

                    } else if (source != undefined) {

                        if ((binding.mode == 'bool' || binding.mode == 'reverse-bool') && binding.arrayIndex == 'n') {

                            // TRANSFORM ARRAY OF BOOL IN LIST OF TRUE OR FALSE INDEXES
                            var computeValue = '';
                            for (var indexArray = 0; indexArray <= source.length; indexArray++)
                                if (source[indexArray] == (binding.mode == 'bool')) computeValue += indexArray + ',';
                            
                            value = value.replace(fieldPrefixes[index] + fieldName + fieldSuffixes[index], computeValue.substring(0, Math.max(0, computeValue.length - 1)));
                        
                        } else {

                            if (value == fieldPrefixes[index] + fieldName + fieldSuffixes[index]) value = source;
                            else value = value.replace(fieldPrefixes[index] + fieldName + fieldSuffixes[index], JSON.stringify(source));
                        
                        }

                    } else {

                        value = value.replace(fieldPrefixes[index] + fieldName + fieldSuffixes[index], null);

                    }
                }
            }
        }
    }

    if (isNaN(value) && value != 'null' && isJSONString(value)) {
        value = JSON.parse(value);
    }

    return value;
}

function getBindingData(bindingInfo, thisDataset = Dataset) {

    /* getBindingData()____________________________________________________
    Returns binding value or object property                              */

    try {
        
        /* OBJECT PROPERTIES */
        return eval('thisDataset.' + bindingInfo.binding);

    } catch {

        /* SINGLE VALUES */
        if (thisDataset[bindingInfo.binding] != undefined) return thisDataset[bindingInfo.binding];
        else {

            try {

                setPropertyTree(bindingInfo, thisDataset);
                return eval('thisDataset.' + bindingInfo.binding);

            } catch {

                return null;

            }
        }
    }
    
}

function setPropertyTree(bindingInfo, targetDataset = Dataset, value = null) {

    try {

        if (eval('targetDataset.' + bindingInfo.binding + ' != undefined')) return true;
        else {

            eval('targetDataset.' + bindingInfo.binding + ' = value;');
            return false;
        } 
    
    } catch (e) {

        if (bindingInfo.binding.includes('.')) {

            var properties = bindingInfo.binding.split('.');
            for (var index = 0; index < properties.length; index++) {

                var property       = properties[index];
                var propertyString = index == 0 ? property : propertyString + '.' + property;

                if (eval('targetDataset.' + propertyString + ' == undefined')) {

                    if (index == properties.length - 1) eval('targetDataset.' + propertyString + ' = bindingInfo.default;');
                    else eval('targetDataset.' + propertyString + ' = new Object();');

                }
            }

        } else {
                        
            if (targetDataset[bindingInfo.binding] == undefined) targetDataset[bindingInfo.binding] = null; // eval('targetDataset.' + bindingInfo.binding + ' = null;');
        }
    }
}

function setBindingData(bindingInfo, value, thisDataset = Dataset) {

    /* setBindingData()____________________________________________________
    Sets value for given binding                                          */

    try {
        
        /* OBJECT PROPERTIES */
        setPropertyTree(bindingInfo, thisDataset);
        eval('thisDataset.' + bindingInfo.binding + ' = value;');

    } catch (e) {

        /* SINGLE VALUES */
        thisDataset[bindingInfo.binding] = value;
    }
    
}

function replaceAdapterFieldValue(value, responseDataset = null, sourceControl = null, thisDataset = Dataset) {

    /* replaceAdapterFieldValue()__________________________________________
    Replaces field values using special adapter method                    */

    var replaceValue    = ''; 
    var name            = value.substring(value.indexOf('{[') + 2, value.indexOf(']}'));
    var field           = name.split('::')[1];
    var adapter         = name.split('::')[0];

    if (ControlProviders[adapter] != undefined) replaceValue = ControlProviders[adapter].replaceFieldValue(field, responseDataset, sourceControl, thisDataset);
    else if (Adapters[adapter] != undefined)    replaceValue = Adapters[adapter].replaceFieldValue(field, responseDataset, sourceControl, thisDataset);

    return value.replace('{[' + name + ']}', replaceValue);
}

function triggerAdapterUpdate() {

    /* triggerAdapterUpdate()______________________________________________
    Manually triggers control update (i.e. after button was pressed)      */

    setTimeout(function () { refreshStates(true); }, 1000);

}

function toAdapterDataSet(convertDataSet) {

    /* toAdapterDataSet()__________________________________________________
    Returns dataset with id and value property                            */

    var returnObject = {};
    convertDataSet.forEach(item => returnObject[item.id] = item.val);

    return returnObject;
}

/* =========================================================
    CONTROLS
   ========================================================= */
function refreshControl(controlInfo, adapter) {

    /* refreshControl()________________________________________________________
    Refreshes control using assigned adapter                                  */

    var bindingInfo     = getBindingInfo(controlInfo.binding);
    var bindValue       = getBindingValue(bindingInfo);

    if (bindValue != undefined || hasDataDependencies(controlInfo)) {

        var control = controlInfo.control;

        /* SET VALUE(S) PROPERTIES */
        if (typeof bindValue === 'object' || Array.isArray(bindValue)) {

            // LIST OF VALUES
            if (control.tagName.toLowerCase() != 'reference') control.setAttribute('cc-values', JSON.stringify(bindValue));
            else control.setAttribute('cc-value', JSON.stringify(bindValue));

        } else {

            /* SET VALUE */
            controlInfo.control.setAttribute('cc-value', bindValue);
        }
        
        /* DRAW CONTROL VALUE */
        if (control.tagName.toLowerCase() != 'reference') drawControlValue(controlInfo, bindValue, adapter);
        
        //refreshConditionControls();

        //console.log('Controls: Refresh for ' + control.id);
    }
}

function drawControlValue(controlInfo, value, adapter) {

    /* drawControlValue()______________________________________________________
    Sets value of control                                                    */

    if (controlInfo.control.hasAttribute('cc-type')) {

        var typeAttr        = controlInfo.control.getAttribute('cc-type').toLowerCase();
        var decimals        = controlInfo.control.getAttribute('cc-decimals');

        var prefix          = controlInfo.control.hasAttribute('cc-prefix') ? controlInfo.control.getAttribute('cc-prefix') : '';
        var suffix          = controlInfo.control.hasAttribute('cc-suffix') ? controlInfo.control.getAttribute('cc-suffix') : '';
        var offset          = controlInfo.control.getAttribute('cc-offset');
        var content         = controlInfo.control.hasAttribute('cc-content') ? controlInfo.control.getAttribute('cc-content') : '';
        var contentStyle    = controlInfo.control.hasAttribute('cc-content-style') ? controlInfo.control.getAttribute('cc-content-style') : '';
        var contentClass    = controlInfo.control.hasAttribute('cc-content-class') ? controlInfo.control.getAttribute('cc-content-class') : '';

        switch (typeAttr) {

            case 'numeric':

                value = parseFloat((parseFloat(value) + (offset != null ? parseFloat(offset) : 0))).toFixed((decimals != null ? parseFloat(decimals) : 0));
                if (NUMBER_FORMAT == 'EU') value = replaceComma(value);

            case 'html': case 'text': case 'src':

                if (typeAttr == 'src') controlInfo.control.src = prefix + value + suffix;
                else controlInfo.control.innerHTML = prefix + value + suffix;
                break;

            case 'img':
                controlInfo.control.innerHTML = prefix + '<img src="img/' + content + '" class="' + contentClass + '" style="' + contentStyle + '">' + suffix;
                break;

            case 'date': case 'time': case 'shorttime':

                if (value != undefined && value != null) {
                    value = (typeAttr == 'date' ? value : value.substring(0, (typeAttr == 'shorttime' ? 5 : 8)));
                    controlInfo.control.innerHTML = prefix + value + suffix;
                } break;

            case 'button': case 'switch': case 'select': case 'scene':

                var controlProvider = (controlInfo.control.hasAttribute('cc-control-provider') ? controlInfo.control.getAttribute('cc-control-provider') : DEFAULT_CONTROL);
                if (ControlProviders[controlProvider] != undefined && value != undefined) {
                    try {
                        ControlProviders[controlProvider].updateActiveState(controlInfo, adapter.checkActiveState(value, typeAttr, controlInfo.control.getAttribute('cc-true')));
                    } catch (err) {
                        // ERROR
                    }
                } break;

            default:

                var controlProvider = (controlInfo.control.hasAttribute('cc-control-provider') ? controlInfo.control.getAttribute('cc-control-provider') : DEFAULT_LIST_CONTROL);
                if (ControlProviders[controlProvider] != undefined) {
                    ControlProviders[controlProvider].parseControl(controlInfo, value);
                } break;

        }
    }
}

function refreshControls(bindingInfo, adapter = this) {

    /* refreshControls()_____________________________________________________
    Refreshes all controls in bindingInfo controls collection               */

    if (bindingInfo.controls != null) {
        
        bindingInfo.controls.forEach(control => {

            controlInfo = getControlInfo(control);
            refreshControl(controlInfo, adapter);
        });
    }
}

function hasDataDependencies(controlInfo) {

    return (controlInfo.control != null && controlInfo.control.hasAttribute('cc-type') && ['combo'].includes(controlInfo.control.getAttribute('cc-type').toLowerCase()));
}

function refreshAdapterControls(adapter) {

    /* refreshAdapterControls()______________________________________________
    Refreshes all controls bound to given adapter                           */

    AdapterBindings.forEach(bindingInfo => { 
        if (bindingInfo.provider == adapter.adapterName && bindingInfo.hasControl) 
            refreshControls(bindingInfo, adapter); 
            if (bindingInfo.isReference) refreshControls(bindingInfo, Adapters.internal);
        });

}

function applyCondition(control, conditionObject, data = Dataset) {

    /* applyCondition()___________________________________________________
    Applys conditions to control (i.e. visibility)                       */

    if (data != null && data != {}) conditionObject.forEach(function (condition) {

        var binding      = condition.binding;
        var bindingValue = condition.provider == 'internal' ? eval('data.' + binding) : data[binding];
        
        var conditionsMet = true;

        // CHECK IF VALUE "undefined", "null" OR empty
        if (condition.empty != undefined) {
            
            if (!condition.empty && (bindingValue == undefined || bindingValue == null || (typeof bindingValue === 'string' ? bindingValue == '' : bindingValue.length == 0))) conditionsMet = false;
            else if (condition.empty && !(bindingValue == undefined || bindingValue == null || (typeof bindingValue === 'string' ? bindingValue == '' : bindingValue.length == 0))) conditionsMet = false;
        }

        // CHECK VALUE
        if (condition.or != undefined && condition.or == true) {

            // CONDITIONS CONNECTED WITH 'OR'

            var conditionsMet = false;

            if (condition.value         != undefined && bindingValue == condition.value)                        conditionsMet = true;
            if (condition.larger        != undefined && bindingValue > condition.larger)                        conditionsMet = true;
            if (condition.largerEqual   != undefined && bindingValue >= condition.largerEqual)                  conditionsMet = true;
            if (condition.smaller       != undefined && bindingValue < condition.smaller)                       conditionsMet = true;
            if (condition.smallerEqual  != undefined && bindingValue <= condition.smallerEqual)                 conditionsMet = true;
            if (condition.not           != undefined && bindingValue != condition.not)                          conditionsMet = true;
            
            if (condition.startsWith    != undefined && bindingValue.startsWith(condition.startsWith))          conditionsMet = true;
            if (condition.endsWith      != undefined && bindingValue.endsWith(condition.endsWith))              conditionsMet = true;
            if (condition.contains      != undefined && bindingValue.includes(condition.contains))              conditionsMet = true;
            if (condition.notStartsWith != undefined && !bindingValue.startsWith(condition.notStartsWith))      conditionsMet = true;
            if (condition.notEndsWith   != undefined && !bindingValue.endsWith(condition.notEndsWith))          conditionsMet = true;
            if (condition.notContains   != undefined && !bindingValue.includes(condition.notContains))          conditionsMet = true;
       
        } else {

            // CONDITIONS CONNECTED WITH 'AND'

            if (condition.value         != undefined && bindingValue != condition.value)                        conditionsMet = false;
            if (condition.larger        != undefined && bindingValue <= condition.larger)                       conditionsMet = false;
            if (condition.largerEqual   != undefined && bindingValue < condition.largerEqual)                   conditionsMet = false;
            if (condition.smaller       != undefined && bindingValue >= condition.smaller)                      conditionsMet = false;
            if (condition.smallerEqual  != undefined && bindingValue > condition.smallerEqual)                  conditionsMet = false;
            if (condition.not           != undefined && bindingValue == condition.not)                          conditionsMet = false;
            
            if (bindingValue != null) {
                if (condition.startsWith    != undefined && !bindingValue.startsWith(condition.startsWith))     conditionsMet = false;
                if (condition.endsWith      != undefined && !bindingValue.endsWith(condition.endsWith))         conditionsMet = false;
                if (condition.contains      != undefined && !bindingValue.includes(condition.contains))         conditionsMet = false;
                if (condition.notStartsWith != undefined && bindingValue.startsWith(condition.notStartsWith))   conditionsMet = false;
                if (condition.notEndsWith   != undefined && bindingValue.endsWith(condition.notEndsWith))       conditionsMet = false;
                if (condition.notContains   != undefined && bindingValue.includes(condition.notContains))       conditionsMet = false;
            }

        }

        if (conditionsMet) {
            if (condition.style != undefined) {
                for (var key in condition.style) {

                    try {

                        control.style[key] = condition.style[key];

                    } catch (e) {

                        // ERROR SETTING PROPERTY

                    }
                }
            }
            if (condition.class != undefined) {
                control.setAttribute('class', condition.class);
            }
        }
    });
}

function checkActiveState(control, bindValue) {


    /* checkActiveState()___________________________________________________
    Check active state based on bindings and "trueIf"-definition in config */

    var activeState = false;
    if (control.hasAttribute('cc-true')) {

    if (control.getAttribute('cc-true').startsWith('[')) var trueValues = JSON.parse(control.getAttribute('cc-true'));
    else var trueValues = [control.getAttribute('cc-true')];

    trueValues.forEach(trueValue => {
        if (trueValue == bindValue) activeState = true;
    });

    } else activeState = (bindValue == undefined ? false : toBool(bindValue));

    return activeState;

}

/* =========================================================
    TOOLS
   ========================================================= */
function getRequestProperties(payload) {

    if (payload == null) return '';
    else {
        var returnString = '?';
        Object.keys(payload).forEach(key => {
            returnString += key + '=' + (typeof payload[key] === 'object' ? JSON.stringify(payload[key]) : payload[key])  + '&'
        });
        return returnString.substring(0, returnString.length - 1);
    }
}

function getProviderBindings(objectsArray, provider = 'iobroker', includeDelayed = false, onlyDelayed = false) {

    /* getProviderBindings()_______________________________________________
    Gets all provider based control bindings                              */

    var returnArray = [];
    objectsArray.forEach(item => { if (item.provider == provider && !returnArray.includes(item.binding) && (includeDelayed || item.bindingDelay == undefined || item.bindingDelay == false)) {
        
        if ((includeDelayed == true && onlyDelayed == false) || 
            (includeDelayed == true && onlyDelayed == true && item.bindingDelay != undefined && item.bindingDelay == true) ||
            (includeDelayed == false && (item.bindingDelay == undefined || item.bindingDelay == false))) {
                returnArray.push(item.binding);
            }
        
    }});
    return returnArray;
}

function getDataProvider(element) {

    /* getDataProvider()______________________________________________________
    Gets data provider of element                                            */

    var returnValue = DEFAULT_ADAPTER;

    if (element.hasAttribute('cc-data-provider')) returnValue = element.getAttribute('cc-data-provider');
    else if (element.hasAttribute('cc-provider')) returnValue = element.getAttribute('cc-provider');

    return returnValue;
}

function isVisibleBinding(binding) {

    /* isVisibleBinding()___________________________________________________
    Checks if binding controls are visible to user                         */

    var bindingInfo = getBindingInfo(binding);
    return (bindingInfo.hasControl && !SmartHomeUI.areHiddenWindowControls(bindingInfo.controls));
    
}

function isConditionBinding(binding) {

    /* isConditionBinding()______________________________________________
    Checks if binding is used by a condition (instead of control)       */

    return (ConditionalControls.filter(item => item.conditions.includes(binding) || item.conditions.includes(binding.replace(/\//g, '\\/'))).length > 0);
}

function getConditionBindings(conditions) {

    /* getConditionBindings()______________________________________________
    Gets all datapoints for condition evaluation                          */

    if (typeof conditions === 'string') {
        if (conditions == '') return [];
        else conditions = JSON.parse(urlDecode(conditions));
    }

    var returnArray = [];
    conditions.forEach(function (condition) {

        //var binding = { binding: condition.binding, provider: (condition.bindingProvider != undefined ? condition.bindingProvider : DEFAULT_ADAPTER), hasControl: false, controlId: null, control: null };
        var binding = getBindingInfo(condition.binding);    
        binding.provider = (condition.bindingProvider != undefined ? condition.bindingProvider : DEFAULT_ADAPTER);

        if (returnArray.filter(item => { return item.binding === condition.binding }).length == 0)
            returnArray.push(binding);

    });

    return returnArray;
}

function toggleValue(value, defaultValue = null) {

    /* toggleValue()_________________________________________________________
    Toggles value to opposite                                               */

    switch (value.toString().toUpperCase()) {
        case '0': return 1;
        case '1': return 0;
        case 'TRUE': return 'false';
        case 'FALSE': return 'true';
        case 'ON': return 'off';
        case 'OFF': return 'on';
        default: return defaultValue;
    }
}

function booleanizeValue(value, simple = false) {

    /* booleanizeValue()_____________________________________________________
    Checks if value is boolean and returns boolean then                     */

    if (toggleValue(value) != null) {

        if (simple) {

            switch (value.toString().toUpperCase()) {
        
                case 'TRUE':    return true;
                case 'FALSE':   return false;
                default:        return value;
            
            }      
        
        } else {
        
            switch (value.toString().toUpperCase()) {
        
                case '0':       return false;
                case '1':       return true;
                case 'ON':      return true;
                case 'OFF':     return false;
                
                case 'TRUE':    return true;
                case 'FALSE':   return false;
                default:        return value;
            
            }      
        }

    } else return value;

}




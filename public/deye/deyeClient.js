var curUrl = window.location.href.slice(0, -5);
var socket = io(curUrl + ':80');

document.body.onload = getSwLog();
document.body.onload = refreshDeyeMain();

var start;
var end;
var leftSideLength = 40;

function setDeyeGridBuyNow(text) {
    $('#deyeGridBuyNow').text(text);
}

function createDiv(divId, cssClass, text="container") {
    const newDiv = document.createElement("div");
    newDiv.setAttribute("class", cssClass);
    newDiv.setAttribute("id", divId);
    newDiv.innerHTML = text;

    return newDiv;
}

function createSolarContainer(subStatusDiv) {
    subStatusDiv.appendChild(createDiv('deyeSolar', 'grid-container-deye-solar', ""));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarHeader', 'deye-solar-header', "Solar"));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarDaily_Production', 'deye-grid-value', 'Daily: 0.0W'));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarTotal_Production', 'deye-grid-value', 'Total: 0.0V'));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV1_Voltage', 'deye-grid-value', 'PV1-V: 0.0V'));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV2_Voltage', 'deye-grid-value', 'PV2-V: 0.0V'));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV1_Current', 'deye-grid-value', 'PV1-I: 0.0A'));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV2_Current', 'deye-grid-value', 'PV2-I: 0.0A'));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV1_Power', 'deye-grid-value', 'PV2-P: 0.0W'));
    document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV2_Power', 'deye-grid-value', 'PV2-P: 0.0W'));
}

function createBatteryContainer(subStatusDiv) {
    subStatusDiv.appendChild(createDiv('deyeBattery', 'grid-container-deye-battery', ""));
    document.getElementById('deyeBattery').appendChild(createDiv('deyeBatteryHeader', 'deye-battery-header', "Battery"));
    document.getElementById('deyeBattery').appendChild(createDiv('deyeBatteryValue', 'deye-grid-value', 'Discharge'));
    document.getElementById('deyeBattery').appendChild(createDiv('deyeBattery_SOC', 'deye-grid-value', 'SOC: 0%'));
    document.getElementById('deyeBattery').appendChild(createDiv('deyeBattery_Voltage', 'deye-grid-value', 'U: 0.0V'));
    document.getElementById('deyeBattery').appendChild(createDiv('deyeBattery_Current', 'deye-grid-value', 'I: 0.0A'));
    document.getElementById('deyeBattery').appendChild(createDiv('deyeBattery_Power', 'deye-grid-value', 'Power: 0.0W'));
    document.getElementById('deyeBattery').appendChild(createDiv('deyeBattery_Temperature', 'deye-grid-value', 'Temp: 0.0' + String.fromCharCode(176) + 'C'));
}

function createGridContainer(subStatusDiv) {
    subStatusDiv.appendChild(createDiv('deyeGrid', 'grid-container-deye-grid', ""));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridHeader', 'deye-grid-header', "Grid"));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridDaily', 'deye-grid-left', 'Buy\n0.0W\n0.0Hz'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridTotal', 'deye-grid-right', 'Buy\nToday: 0.0W\nTotal: 0.0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridInternal_CT_L1_Power', 'deye-grid-value', 'CT1: 0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridExternal_CT_L1_Power', 'deye-grid-value', 'LD1: 0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridTotal', 'deye-grid-value', 'SOLD:'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridInternal_CT_L2_Power', 'deye-grid-value', 'CT2: 0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridExternal_CT_L2_Power', 'deye-grid-value', 'LD2: 0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridTotal', 'deye-grid-value', 'Today: 0.0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridInternal_CT_L3_Power', 'deye-grid-value', 'CT3: 0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridExternal_CT_L3_Power', 'deye-grid-value', 'LD4: 0W'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridTotal', 'deye-grid-value', 'Today: 0.0kWh'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridGrid_Voltage_L1', 'deye-grid-value', 'L1: 0V'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridGrid_Voltage_L2', 'deye-grid-value', 'L2: 0V'));
    document.getElementById('deyeGrid').appendChild(createDiv('deyeGridGrid_Voltage_L3', 'deye-grid-value', 'L3: 0V'));
}

function showSubStatus(name) {
    const subStatusDiv = document.getElementById('deyeSubStatus');

    /* First - remove eveything form SubStatus div */
    while(subStatusDiv.firstChild) { 
        subStatusDiv.removeChild(subStatusDiv.firstChild); 
    } 

    switch (name) {
        case 'solar':
            createSolarContainer(subStatusDiv);
            refreshDeyeSolar();
        break;
        case 'battery':
            createBatteryContainer(subStatusDiv);
            refreshDeyeBattery();
        break;
        case 'grid':
            createGridContainer(subStatusDiv);
            refreshDeyeGrid();
        break;
        // case 'load':
        //     createBatteryContainer(subStatusDiv);
        // break;
        default:

        break;
    }
}

function getSwLog() {
    socket.emit("deyeSwLog");
}

function refreshButton() {
    start = performance.now();
    socket.emit("deyeRefresh");
}

function refreshSwStatus() {
    socket.emit("deyeSwStatus");
}

function refreshDeyeMain() {
    socket.emit("deyeRefresh", "main");
}

function refreshDeyeSolar() {
    socket.emit("deyeRefresh", "solar");
}

function refreshDeyeGrid() {
    socket.emit("deyeRefresh", "grid");
}

function refreshDeyeBattery() {
    socket.emit("deyeRefresh", "battery");
}

function refreshDeyeLoad() {
    socket.emit("deyeRefresh", "load");
}

function changeMainCell(divName, newText) {
    var oldText = $('#' + divName).text();

    if (oldText != newText) {
        $('#' + divName).text(newText);
        $('#' + divName).css({"background-color":"rgba(255, 255, 0, 1)", "transition":"background-color 0.8s ease"});

        setTimeout(() => {
            $('#' + divName).css({"background-color":"rgba(255, 255, 255, 1)", "transition":"background-color 0.8s ease"});
        }, 800);
    }  
}

function parseMainStatus(data) {
    dataLines = data.split('main ')[1].split('\n');
    var pv1Power = dataLines[0];
    var pv2Power = dataLines[1];
    var totalGridPower = 'Total Grid Power:\n' + dataLines[2].split(':')[1];
    var batteryPower = dataLines[3];
    var batterySOC = dataLines[4];
    var totalLoadPower = 'Total Load Power:\n' + dataLines[5].split(':')[1];

    changeMainCell('deyeMainLeftTop', pv1Power + '\n' + pv2Power);
    changeMainCell('deyeMainRightTop', totalGridPower);
    changeMainCell('deyeMainLeftBot', batteryPower + '\n' + batterySOC);
    changeMainCell('deyeMainRightBot', totalLoadPower);

    // $('#deyeMainLeftTop').text(pv1Power + '\n' + pv2Power);
    // $('#deyeMainRightTop').text(totalGridPower);
    // $('#deyeMainLeftBot').text(batteryPower + '\n' + batterySOC);
    // $('#deyeMainRightBot').text(totalLoadPower);
}

function parseReceivedStatus(data, divName) {
    var stsStr;
    var nameStr;
    var valueStr

    stsStr = data.split(' ').slice(1).join(' ');
    linesStr = stsStr.split('\n');

    while (linesStr[linesStr.length-1] == "") {
        linesStr.pop();
    }
    
    $('#' + divName).text('');

    for (var i = 0; i < linesStr.length; i++) {
        nameStr = linesStr[i].split(':')[0];
        valueStr = linesStr[i].split(':')[1].trim();
        $('#' + divName).text(document.getElementById(divName).textContent + nameStr + ":" + '\n ' + valueStr + '\n'); // ' '.repeat(leftSideLength - nameStr.length)

        $('#deyeSolar' + nameStr.replaceAll(' ', '_')).text(nameStr + ': ' + valueStr);
        $('#deye' + nameStr.replaceAll(' ', '_')).text(nameStr + ': ' + valueStr);
        $('#deyeGrid' + nameStr.replaceAll(' ', '_')).text(nameStr + ': ' + valueStr);
    }

    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPower', 'deye-solar-power', 'Power: 0.0W'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarToday_Production', 'deye-grid-value', 'Today: 0.0W'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarTotal_Production', 'deye-grid-value', 'Total: 0.0V'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV1_Voltage', 'deye-grid-value', 'PV1-V: 0.0V'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV2_Voltage', 'deye-grid-value', 'PV2-V: 0.0V'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV1_Current', 'deye-grid-value', 'PV1-I: 0.0A'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV2_Current', 'deye-grid-value', 'PV2-I: 0.0A'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV1_Power', 'deye-grid-value', 'PV2-P: 0.0W'));
    // document.getElementById('deyeSolar').appendChild(createDiv('deyeSolarPV2_Power', 'deye-grid-value', 'PV2-P: 0.0W'));


    // "PV1 Power: 0.00W"
    // "PV2 Power: 0.00W"
    // "PV1 Voltage: 5.60V"
    // "PV2 Voltage: 7.30V"
    // "PV1 Current: 0.00A"
    // "PV2 Current: 0.00A"
    // "Daily Production: 2.00kWh"
    // "Total Production: 217.30kWh"

    /* Center window */
    switch (divName) {
        case 'solarStatus':

        break;
        default:

        break;
    }
}

socket.on('deyeData', function(data) {
    switch(data.toString().split(' ')[0]) {
        case 'solarStatus':
            parseReceivedStatus(data, 'solarStatus');
        break;
        case 'batteryStatus':
            parseReceivedStatus(data, 'batteryStatus');
        break;
        case 'gridStatus':
            parseReceivedStatus(data, 'gridStatus');
        break;
        case 'loadStatus':
            parseReceivedStatus(data, 'loadStatus');
        break;
        case 'inverterStatus':
            parseReceivedStatus(data, 'inverterStatus');
            end = performance.now();
            console.log(`Execution time: ${end - start} ms`);
        break;
        case 'sw':
            parseReceivedStatus(data, 'swStatus');
        break;
        case 'swLog':
            $('#swStatusLog').text(data.split(' ').slice(1).join(' '));
        break;
        case 'main':
            parseMainStatus(data);
        break;
        default:
            parseReceivedStatus(data, 'solarStatus');
        break;
    }
});

// setInterval(()=> {
//     refreshDeyeMain();
// }, mainRefreshRate);

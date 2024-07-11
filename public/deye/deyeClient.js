var curUrl = window.location.href.slice(0, -5);
var socket = io(curUrl + ':80');

//document.body.onload = getSwLog();
//document.body.onload = debugButton();
document.body.onload = setCurrentDate();

var start;
var end;
var leftSideLength = 40;
var submitName;
var chartNum = 0;
var maxChartNum = 3;

var datasets = [{
    label: '-',
    data: [],
    borderColor: "red",
    fill: false,
    yAxisID: "y",
},
{
    label: '-',
    data: [],
    borderColor: "green",
    fill: false,
    yAxisID: "y1",
},
{
    label: '-',
    data: [],
    borderColor: "blue",
    fill: false,
    yAxisID: "y2",
}]

emptyChart = {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: '-',
            data: [],
            borderColor: "red",
            fill: false
        }],
    },
    options: {
        animation: true,
        parsing: true,
        legend: {display: true},
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        scales: {
            x: {
                ticks: {
                    autoSkip: true,
                    maxRotation: 90,
                    minRotation: 90
                }
            },
            y: {

            },
            y1: {
                display: false
            },
            y2: {
                display: false
            }
        },
    }
};

var deyeChart = new Chart("deyeChart", emptyChart);

function setCurrentDate() {
    document.getElementById('dateFilter').valueAsDate = new Date();
}

function getFilterDate() {
    return document.getElementById('dateFilter').value;
}

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

function debugButton() {
    socket.emit("deyeTest");
}

function refreshMainCell(divName, newText) {
    var oldText = $('#' + divName).text();

    if (oldText != newText) {
        $('#' + divName).text(newText);
        $('#' + divName).css({"background-color":"rgba(255, 255, 0, 1)", "transition":"background-color 0.8s ease"});

        setTimeout(() => {
            $('#' + divName).css({"background-color":"rgba(255, 255, 255, 1)", "transition":"background-color 0.8s ease"});
        }, 800);
    }  
}

function findNameValueByName(name, dataLines) {
    var val = 0;

    for( item in dataLines ) {
        if( dataLines[item].includes(name) ) {
            val = dataLines[item];//.split(':')[1];//.replace(/[^\d.-]/g, '');
        }
    }

    return val;
}

function parseMainStatus(dataLines) {
    var pv1Power = findNameValueByName('PV1 Power', dataLines);
    var pv2Power = findNameValueByName('PV2 Power', dataLines);
    var totalGridPower = findNameValueByName('Total Grid Power', dataLines);
    var batteryPower = findNameValueByName('Battery Power', dataLines);
    var batterySOC = findNameValueByName('Battery SOC', dataLines);
    var totalLoadPower = findNameValueByName('Total Load Power', dataLines);

    refreshMainCell('deyeMainLeftTop', pv1Power + '\n' + pv2Power);
    refreshMainCell('deyeMainRightTop', totalGridPower.replace(': ', '\n'));
    refreshMainCell('deyeMainLeftBot', batteryPower + '\n' + batterySOC);
    refreshMainCell('deyeMainRightBot', totalLoadPower.replace(': ', '\n'));
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

function chartAddData(chart, label, newData) {
    chart.data.labels.push(label);
    chart.data.datasets[chartNum-1].data.push(newData);
    chart.update();
}

function chartRemoveData(chart) {
    chart.data.labels.shift();
    chart.data.datasets[chartNum-1].data.shift();
    chart.update();
}

function setSubmit(button) {
    submitName = button.value;
}

function requestChartData(form) {
    var entryName = form.entryName.value;
    var interval = form.interval.value;
    var addChart = submitName == "Dodaj" ? true : false;
    var dateFilter = submitName == "Filtruj po dacie" ? true : false;

    if(addChart) {
        if(chartNum < maxChartNum) {
            chartNum++;
            if(chartNum > 1) {
                deyeChart.data.datasets.push(datasets[chartNum-1]);
                eval('deyeChart.options.scales.y' + (chartNum-1).toString()).display = true;
            }
        } else {
            chartNum = 1;
        }
    } else {
        chartNum = 1;
        while (deyeChart.data.datasets[chartNum-1].data.length > 0) {
            chartRemoveData(deyeChart);
        }

        /* remove time labels each time */
        while(deyeChart.data.labels.length > 0) {
            deyeChart.data.labels.shift();
        }

        deyeChart.data.datasets = [datasets[0]];
        eval('deyeChart.options.scales.y' + (1).toString()).display = false;
        eval('deyeChart.options.scales.y' + (2).toString()).display = false;
    }

    if(dateFilter) {
        interval = 'Date=' + getFilterDate();
    }

    socket.emit("getChartData", entryName, interval);
    deyeChart.data.datasets[chartNum-1].label = entryName;
}

socket.on('deyeData', function(data) {
    var deyeDataLines = data.split('\n');
    /* remove empty lines */
    while (deyeDataLines[deyeDataLines.length-1] == "") {
        deyeDataLines.pop();
    }

    parseMainStatus(deyeDataLines);

    var deyeDataArray = [];
    for (line in deyeDataLines) {
        var dataName = deyeDataLines[line].split(': ')[0];
        var dataValue = deyeDataLines[line].split(': ')[1];
        deyeDataArray.push([dataName, dataValue]);
        $('#deyeSolar' + dataName.replaceAll(' ', '_')).text(dataName + ': ' + dataValue);
        $('#deye' + dataName.replaceAll(' ', '_')).text(dataName + ': ' + dataValue);
        $('#deyeGrid' + dataName.replaceAll(' ', '_')).text(dataName + ': ' + dataValue);
    }

    $('#deyeData').text(data);
});

socket.on('deyeMySqlData', function(data) {
    // while (deyeChart.data.datasets[chartNum-1].data.length > 0) {
    //     chartRemoveData(deyeChart);
    // }

    /* remove time labels each time */
    while(deyeChart.data.labels.length > 0) {
        deyeChart.data.labels.shift();
    }

    for (item in data) {
        chartAddData(deyeChart, data[item].split('=')[0].slice(8, -24).replaceAll(' ', '.'), data[item].split('=')[1]);
    }
    deyeChart.update();
});

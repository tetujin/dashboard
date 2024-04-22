var chartsProperties = [
    {
        id: 'accelerometerChart',
        labels: ['X', 'Y', 'Z'],
        colors: ['#FF6347', '#3CB371', '#1E90FF'], // Tomatillo, Medium Sea Green, Dodger Blue
        unit: 'm/s\u00B2',
    },
    {
        id: 'gyroscopeChart',
        labels: ['X', 'Y', 'Z'],
        colors: ['#FFD700', '#FF4500', '#D8BFD8'], // Gold, OrangeRed, Indigo
        unit: '°/s',
    },
    {
        id: 'magnetometerChart',
        labels: ['X', 'Y', 'Z'],
        colors: ['#F08080', '#98FB98', '#ADD8E6'], // Light Coral, Pale Green, Light Blue
        unit: 'µT',
    },
    {
        id: 'pressureSensorChart',
        labels: ['pressure'],
        colors: ['#32CD32'],                       // Lime Green
        unit: 'Pa',
    },
    {
        id: 'temperatureSensorChart',
        labels: ['temperature'],
        colors: ['#FFA07A'],                       // Light Salmon
        unit: '°C',
    },
    {
        id: 'heartRateChart',
        labels: ['heart rate'],
        colors: ['#FF6347'],                       // Tomatillo
        unit: 'bpm',
    },
    {
        id: 'SpO2Chart',
        labels: ['blood oxygen saturation'],
        colors: ['#ADD8E6'],                       // Light Coral
        unit: '%',
    },
    {
        id: 'ppgChart',
        labels: ['PPG (red)', 'PPG (infrared)'],
        colors: ['#FF0000', '#800000'],            // Red, Deep Maroon
        unit: 'amplitude',
    }
];

var charts = [];

chartsProperties.forEach((chartProperties) => {
    var ctx = document.getElementById(chartProperties.id);
    var datasets = [];

    // If it's accel, gyro, or mag, we add 3 datasets. Otherwise, just 1 dataset.
    for (let j = 0; j < chartProperties.labels.length; j++) {
        datasets.push({
            label: chartProperties.labels[j],
            data: [],
            borderColor: chartProperties.colors[j],
            borderWidth: 1,
            fill: false,
            pointRadius: 0
        });
    }

    var chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    display: false,
                    type: 'linear',
                    title: {
                        display: false,
                        text: 'Sample Index'
                    },
                    min: 0,
                    max: 149
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: chartProperties.unit
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });

    chart.id = chartProperties.id; // Assign an ID to each chart for easy identification
    charts.push(chart);
});

let prevRawOrientation = {
    pitch: 0,
    roll: 0,
    yaw: 0
};

let prevOrientation = {
    pitch: 0,
    roll: 0,
    yaw: 0
};

function unwrapAngle(newAngle, previousAngle) {
    const diff = newAngle - previousAngle;
    if (diff > 180) {
        return newAngle - 360;
    } else if (diff < -180) {
        return newAngle + 360;
    } else {
        return newAngle;
    }
}

function computeOrientation(acc, mag, alpha = 0.2) {
    let ax = acc[0], ay = acc[1], az = acc[2];
    let mx = mag[0], my = mag[1], mz = mag[2];

    // Pitch & Roll (assuming accelerometer measures -g when resting)
    const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
    const roll = Math.atan2(ay, az);

    // Yaw (with tilt compensation)
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);
    
    const mxTilt = mx * cosPitch + mz * sinPitch;
    const myTilt = mx * sinRoll * sinPitch + my * cosRoll - mz * sinRoll * cosPitch;
    const yaw = Math.atan2(-myTilt, mxTilt);
    
    // Convert from radians to degrees
    const pitchDeg = pitch * (180.0 / Math.PI);
    const rollDeg = roll * (180.0 / Math.PI);
    const yawDeg = yaw * (180.0 / Math.PI);

    // Smoothing using Exponential Moving Average
    let smoothPitch = alpha * pitchDeg + (1 - alpha) * prevOrientation.pitch;
    let smoothRoll = alpha * rollDeg + (1 - alpha) * prevOrientation.roll;
    let smoothYaw = alpha * yawDeg + (1 - alpha) * prevOrientation.yaw;

    prevOrientation = {
        pitch: smoothPitch,
        roll: smoothRoll,
        yaw: smoothYaw
    };

    return prevOrientation;
}



function updateOrientation(acc, gyro, mag) {
    var rpy = computeOrientation(acc, mag);

    // Update the orientation of the model
    const modelViewerElement = document.querySelector('model-viewer');
    $('#rollAngleValue').text((rpy.roll).toFixed(2));
    $('#pitchAngleValue').text(rpy.pitch.toFixed(2));
    //$('#yawAngleValue').text(0);

    // switch axis because 3d modell has them flipped
    modelViewerElement.setAttribute('orientation', `${rpy.pitch}deg ${-rpy.roll}deg ${0}deg`);
}

function onSensorDataReceivedCallback(side) {
    return (sensorData) => {
        if (selectedEarable == side) {
            switch (sensorData.sensorId) {
                case 0: // Assuming sensorId 0 is the accelerometer, gyroscope, and magnetometer combined data
                    var acc_x = sensorData.ACC.X;
                    var acc_y = sensorData.ACC.Y;
                    var acc_z = sensorData.ACC.Z;
                    var gyr_x = -sensorData.GYRO.X;
                    var gyr_y = sensorData.GYRO.Z;
                    var gyr_z = sensorData.GYRO.Y;
                    var mag_x = -sensorData.MAG.X;
                    var mag_y = sensorData.MAG.Z;
                    var mag_z = sensorData.MAG.Y;
                    var acc = [acc_x, acc_y, acc_z];
                    var gyro = [gyr_x, gyr_y, gyr_z];
                    var mag = [mag_x, mag_y, mag_z];
                    updateChart('accelerometerChart', acc);
                    updateChart('gyroscopeChart', gyro);
                    updateChart('magnetometerChart', mag);
        
                    updateOrientation(
                        acc, gyro, mag
                    );
                    break;
                case 1:
                    updateChart('pressureSensorChart', [sensorData.BARO.Pressure]);
                    updateChart('temperatureSensorChart', [sensorData.TEMP.Temperature])
                case 3:
                    updateChart('ppgChart', [sensorData.PPG.Red, sensorData.PPG.Infrared])
                case 4: 
                    updateChart('heartRateChart', [sensorData.PULSOX.HeartRate])
                    updateChart('SpO2Chart', [sensorData.PULSOX.SpO2])
                case 5:
                    // TODO: Add optical temperature data to some chart. Difficult because sampling rate can be different to BARO
            }
        }
    }
}
openEarableL.sensorManager.subscribeOnSensorDataReceived(onSensorDataReceivedCallback(EarableSide.LEFT));
openEarableR.sensorManager.subscribeOnSensorDataReceived(onSensorDataReceivedCallback(EarableSide.RIGHT));

function updateChart(chartId, values) {
    const chart = charts.find(chart => chart.id === chartId);
    if (!chart) return;

    if (chart.data.labels.length >= 150) {
        chart.data.labels.shift();
        for (const dataset of chart.data.datasets) {
            dataset.data.shift();
        }
    }

    const nextIndex = chart.data.labels.length > 0
        ? chart.data.labels[chart.data.labels.length - 1] + 1
        : 0;

    chart.data.labels.push(nextIndex);

    for (let i = 0; i < values.length; i++) {
        chart.data.datasets[i].data.push(values[i]);
    }

    if (chart.data.labels.length >= 150) {
        const min = chart.data.labels[0];
        const max = chart.data.labels[chart.data.labels.length - 1];

        // Assuming you're using Chart.js version 3.x or later
        chart.options.scales.x.min = min;
        chart.options.scales.x.max = max;
    }

    chart.update();
}

function onClearGraphs() {
    chartsProperties.forEach((chartProperties) => {
        const chart = charts.find(chart => chart.id === chartProperties.id);
        if (chart) {
            chart.data.labels.length = 0;
            chart.data.datasets.forEach((dataset) => {
                dataset.data.length = 0;
            });
            chart.options.scales.x.min = 0;
            chart.options.scales.x.max = 149;
            setTimeout(() => chart.update(), 0);
        }
    });
}

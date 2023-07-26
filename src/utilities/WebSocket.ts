import { io } from "socket.io-client";
import { ChartManager } from "../charts/charts";
import { DataModel } from "../table/DataModel";

export default async function connectWebsocket(url: string, cm: ChartManager) {
    const socket = io(url);

    const originalPopOutChart = cm._popOutChart;
    cm._popOutChart = (chart) => {
        originalPopOutChart.apply(cm, [chart]);
        socket.emit("popout", chart.config.id);
    }

    socket.connect();
    socket.on("popout", async (chartID: string) => {
        // await new Promise((resolve) => setTimeout(resolve, 5000));
        const chart = cm.charts[chartID];
        if (!chart) {
            console.error(`Chart ${chartID} not found`);
            socket.emit("popout_fail", chartID);
        } else {
            cm._popOutChart(chart.chart);
        }
    });
    // DataModel: register with all datastore changes & send appropriate updates.
    // TOOD: Types, Zod?
    for (const ds of cm.dataSources) {
        const dataModel = new DataModel(ds.dataStore);
        dataModel.addListener('socket', () => {
            socket.emit('filter', {dataSource: ds.name, indices: dataModel.data});
        });
    }
    
    // debugger;
}

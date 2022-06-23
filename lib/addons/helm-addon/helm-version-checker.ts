import { loadExternalYaml } from "../../utils";
import { HelmChartConfiguration } from "./kubectl-provider";

type HelmChartVersion = Omit<HelmChartConfiguration, "name" | "namespace" | "values">;

export function listCharts(chart: HelmChartVersion): any {
    // TODO make function async and use async HTTP client to get results
    const helmRepository = loadExternalYaml(chart.repository + "/index.yaml");
    for(Object.keys(helmRepository['entries']).filter())
}
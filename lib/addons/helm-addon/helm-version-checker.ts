import { loadExternalYaml } from "../../utils";
import { HelmChartConfiguration } from "./kubectl-provider";

import * as semverSort from 'semver-sort';

type HelmChartVersion = Omit<HelmChartConfiguration, "name" | "namespace" | "values">;

const semverCompare = (a: string, b: string) => { 
 
    // 1. Split the strings into their parts.
    const a1 = a.split('.');
    const b1 = b.split('.');
    // 2. Contingency in case there's a 4th or 5th version
    const len = Math.min(a1.length, b1.length);
    // 3. Look through each version number and compare.
    for (let i = 0; i < len; i++) {
        const a2 = +a1[ i ] || 0;
        const b2 = +b1[ i ] || 0;
        
        if (a2 !== b2) {
            return a2 > b2 ? -1 : 1;
        }
    }
    return b1.length - a1.length;
};

export interface HelmChartVersionValidationResult {
    highestVersion: string | undefined,
    latestVersion: boolean,
    allVersions: string[];
}

export function listChartVersions(chart: HelmChartVersion): string[] {
    // TODO make function async and use async HTTP client to get results
    const helmRepository = loadExternalYaml(chart.repository + "/index.yaml");
    const versions: string[] = Object.values(helmRepository[0]['entries'][chart.chart])
        .map((e: any) => { return e['version']});
    return versions.filter(e => e.includes("."));
}

export function validateLatestVersion(chart: HelmChartVersion) : HelmChartVersionValidationResult {
    let versions = listChartVersions(chart);
    if(versions === null || versions.length == 0) {
        console.error("No versions are found for " + chart.chart + " in repository " + chart.repository );
        return {
            allVersions: versions,
            highestVersion: undefined,
            latestVersion: false
        };
    }
    versions = versions.sort(semverCompare);
    const latestVersion = (versions[0] === chart.version);
    if(latestVersion) {
        console.log(`Chart ${chart.chart}-${chart.version} is at the latest version.` );
    }
    else {
        console.warn(`Upgrade is needed for chart ${chart.chart}-${chart.version}: latest version is ${versions[0]}.`);
    }
    return {
        allVersions: versions,
        highestVersion: versions[0],
        latestVersion: latestVersion
    };
}
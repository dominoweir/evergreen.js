import * as fs from "fs";
import * as yaml from "js-yaml";
import * as os from "os";
import * as request from "request";
import { client, queryString } from "./evergreen";

const configFilePath = os.homedir() + "/.evergreen.yml";

function getEvergreenClient(): client {
    let user = process.env.API_USER || "";
    let key = process.env.API_KEY || "";
    let serverURL = process.env.API_SERVER || "";

    if (user === "" && key === "" && serverURL === "" && fs.existsSync(configFilePath)) {
        const data = fs.readFileSync(configFilePath, "utf8");
        const localConfig = yaml.safeLoad(data);
        user = localConfig.user;
        key = localConfig.api_key;
        serverURL = localConfig.api_server_host;
    }

    return new client(user, key, serverURL);
}

test("Evergreen client is constructed correctly", () => {
    const user = "me";
    const key = "abc123";
    const serverURL = "www.example.com";
    const evergreen = new client(user, key, serverURL);

    expect(evergreen.username).toBe(user);
    expect(evergreen.key).toBe(key);
    expect(evergreen.serverURL).toBe(serverURL);
});

test("query strings are formed correctly", () => {
    const params1 = {
        param1: "val1",
        param2: true,
        param3: 55,
    };
    expect(queryString(params1)).toBe("?param1=val1&param2=true&param3=55");

    const params2 = {
        undefined: undefined,
        null: null,
    } as any;
    expect(queryString(params2)).toBe("");

    expect(queryString({})).toBe("");
});

test("integration tests with real API, credentials", (done) => {
    const evergreen = getEvergreenClient();
    const toTest: Array<(callback: request.RequestCallback) => void> = [
        evergreen.getDistros,
        evergreen.getRecentTasks,
        evergreen.getAdminConfig,
        evergreen.getBanner,
    ];

    let count = 0;
    const callback = (error: any, response: request.Response, body: any): void => {
        expect(error).toBe(null);
        expect(response.statusCode).toBe(200);
        expect(body).not.toBe(null);
        expect(body).not.toBe(undefined);
        if (count < toTest.length - 1) {
            count++;
        } else {
            done();
        }
    };

    toTest.forEach((fn) => {
        evergreen[fn.name](callback);
    });
});

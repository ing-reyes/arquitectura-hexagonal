import { envs } from "./common/config/envs.config";
import { mongodb, server } from "./container";

(async () => {
    try {
        //* Run Database
        await mongodb.connect();

        //* Run Server
        server.start(envs.PORT);
    } catch (error) {
        console.error('Failed to start the application:', error);
        process.exit(1);
    }
})();

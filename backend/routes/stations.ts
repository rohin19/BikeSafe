import { Router, Request, Response } from 'express';

const stationRouter = Router();


// auto discovery link Lime Vancouver: https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/gbfs.json
// auto discovery link Mobi Bike Share Vancouver: https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/gbfs.json
stationRouter.get('/', async (req: Request, res: Response) => {

});

export default stationRouter;
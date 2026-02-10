// Polyfill ReadableStream for Node 17
import { ReadableStream } from 'web-streams-polyfill/ponyfill';
(global as any).ReadableStream = ReadableStream;

import { Main } from "./app/Main";

const app = new Main();
app.start();

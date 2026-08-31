import { els } from "./dom.js";
import { state } from "./state.js";

import { initConverterEvents } from "./converter/converterEvents.js";
import { initCalculatorEvents } from "./calculator/calculatorEvents.js";

initConverterEvents(els, state);
initCalculatorEvents(els, state);

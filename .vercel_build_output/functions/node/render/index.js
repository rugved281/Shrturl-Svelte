var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* read(parts) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else {
      yield part;
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    if (isBlob(value)) {
      length += value.size;
    } else {
      length += Buffer.byteLength(String(value));
    }
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = body.stream();
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const err = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(err);
        throw err;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error3) {
    if (error3 instanceof FetchBaseError) {
      throw error3;
    } else {
      throw new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error3.message}`, "system", error3);
    }
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error3) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error3.message}`, "system", error3);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = dataUriToBuffer$1(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error3 = new AbortError("The operation was aborted.");
      reject(error3);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error3);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error3);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (err) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, "system", err));
      finalize();
    });
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location2 = headers.get("Location");
        const locationURL = location2 === null ? null : new URL(location2, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              try {
                headers.set("Location", locationURL);
              } catch (error3) {
                reject(error3);
              }
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
        }
      }
      response_.once("end", () => {
        if (signal) {
          signal.removeEventListener("abort", abortAndFinalize);
        }
      });
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error3) => {
        reject(error3);
      });
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), (error3) => {
          reject(error3);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error3) => {
          reject(error3);
        });
        raw.once("data", (chunk) => {
          if ((chunk[0] & 15) === 8) {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), (error3) => {
              reject(error3);
            });
          } else {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), (error3) => {
              reject(error3);
            });
          }
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), (error3) => {
          reject(error3);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, src, dataUriToBuffer$1, Readable, wm, Blob, fetchBlob, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ({ Readable } = import_stream.default);
    wm = new WeakMap();
    Blob = class {
      constructor(blobParts = [], options2 = {}) {
        let size = 0;
        const parts = blobParts.map((element) => {
          let buffer;
          if (element instanceof Buffer) {
            buffer = element;
          } else if (ArrayBuffer.isView(element)) {
            buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
          } else if (element instanceof ArrayBuffer) {
            buffer = Buffer.from(element);
          } else if (element instanceof Blob) {
            buffer = element;
          } else {
            buffer = Buffer.from(typeof element === "string" ? element : String(element));
          }
          size += buffer.length || buffer.size || 0;
          return buffer;
        });
        const type = options2.type === void 0 ? "" : String(options2.type).toLowerCase();
        wm.set(this, {
          type: /[^\u0020-\u007E]/.test(type) ? "" : type,
          size,
          parts
        });
      }
      get size() {
        return wm.get(this).size;
      }
      get type() {
        return wm.get(this).type;
      }
      async text() {
        return Buffer.from(await this.arrayBuffer()).toString();
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of this.stream()) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        return Readable.from(read(wm.get(this).parts));
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = wm.get(this).parts.values();
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            const chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
            blobParts.push(chunk);
            added += ArrayBuffer.isView(chunk) ? chunk.byteLength : chunk.size;
            relativeStart = 0;
            if (added >= span) {
              break;
            }
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        Object.assign(wm.get(blob), { size: span, parts: blobParts });
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.stream === "function" && object.stream.length === 0 && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    fetchBlob = Blob;
    Blob$1 = fetchBlob;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && object[NAME] === "AbortSignal";
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (err) => {
            const error3 = err instanceof FetchBaseError ? err : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${err.message}`, "system", err);
            this[INTERNALS$2].error = error3;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        body.stream().pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const err = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw err;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const err = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_CHAR" });
        throw err;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback) {
        for (const name of this.keys()) {
          callback(this.get(name), name);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status || 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal !== null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-vercel/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-vercel/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/tslib/tslib.js
var require_tslib = __commonJS({
  "node_modules/tslib/tslib.js"(exports, module2) {
    init_shims();
    var __extends;
    var __assign;
    var __rest;
    var __decorate;
    var __param;
    var __metadata;
    var __awaiter;
    var __generator;
    var __exportStar;
    var __values;
    var __read;
    var __spread;
    var __spreadArrays;
    var __spreadArray;
    var __await;
    var __asyncGenerator;
    var __asyncDelegator;
    var __asyncValues;
    var __makeTemplateObject;
    var __importStar;
    var __importDefault;
    var __classPrivateFieldGet;
    var __classPrivateFieldSet;
    var __createBinding;
    (function(factory) {
      var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
      if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function(exports2) {
          factory(createExporter(root, createExporter(exports2)));
        });
      } else if (typeof module2 === "object" && typeof module2.exports === "object") {
        factory(createExporter(root, createExporter(module2.exports)));
      } else {
        factory(createExporter(root));
      }
      function createExporter(exports2, previous) {
        if (exports2 !== root) {
          if (typeof Object.create === "function") {
            Object.defineProperty(exports2, "__esModule", { value: true });
          } else {
            exports2.__esModule = true;
          }
        }
        return function(id, v) {
          return exports2[id] = previous ? previous(id, v) : v;
        };
      }
    })(function(exporter) {
      var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b) {
        d2.__proto__ = b;
      } || function(d2, b) {
        for (var p in b)
          if (Object.prototype.hasOwnProperty.call(b, p))
            d2[p] = b[p];
      };
      __extends = function(d2, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d2, b);
        function __() {
          this.constructor = d2;
        }
        d2.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
      __assign = Object.assign || function(t) {
        for (var s2, i = 1, n = arguments.length; i < n; i++) {
          s2 = arguments[i];
          for (var p in s2)
            if (Object.prototype.hasOwnProperty.call(s2, p))
              t[p] = s2[p];
        }
        return t;
      };
      __rest = function(s2, e) {
        var t = {};
        for (var p in s2)
          if (Object.prototype.hasOwnProperty.call(s2, p) && e.indexOf(p) < 0)
            t[p] = s2[p];
        if (s2 != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s2); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s2, p[i]))
              t[p[i]] = s2[p[i]];
          }
        return t;
      };
      __decorate = function(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
          r = Reflect.decorate(decorators, target, key, desc);
        else
          for (var i = decorators.length - 1; i >= 0; i--)
            if (d2 = decorators[i])
              r = (c < 3 ? d2(r) : c > 3 ? d2(target, key, r) : d2(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
      };
      __param = function(paramIndex, decorator) {
        return function(target, key) {
          decorator(target, key, paramIndex);
        };
      };
      __metadata = function(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
          return Reflect.metadata(metadataKey, metadataValue);
      };
      __awaiter = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
          });
        }
        return new (P || (P = Promise))(function(resolve2, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      __generator = function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      __exportStar = function(m, o) {
        for (var p in m)
          if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
            __createBinding(o, m, p);
      };
      __createBinding = Object.create ? function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function() {
          return m[k];
        } });
      } : function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        o[k2] = m[k];
      };
      __values = function(o) {
        var s2 = typeof Symbol === "function" && Symbol.iterator, m = s2 && o[s2], i = 0;
        if (m)
          return m.call(o);
        if (o && typeof o.length === "number")
          return {
            next: function() {
              if (o && i >= o.length)
                o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
        throw new TypeError(s2 ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      __read = function(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
          return o;
        var i = m.call(o), r, ar = [], e;
        try {
          while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
            ar.push(r.value);
        } catch (error3) {
          e = { error: error3 };
        } finally {
          try {
            if (r && !r.done && (m = i["return"]))
              m.call(i);
          } finally {
            if (e)
              throw e.error;
          }
        }
        return ar;
      };
      __spread = function() {
        for (var ar = [], i = 0; i < arguments.length; i++)
          ar = ar.concat(__read(arguments[i]));
        return ar;
      };
      __spreadArrays = function() {
        for (var s2 = 0, i = 0, il = arguments.length; i < il; i++)
          s2 += arguments[i].length;
        for (var r = Array(s2), k = 0, i = 0; i < il; i++)
          for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
        return r;
      };
      __spreadArray = function(to, from, pack) {
        if (pack || arguments.length === 2)
          for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
              if (!ar)
                ar = Array.prototype.slice.call(from, 0, i);
              ar[i] = from[i];
            }
          }
        return to.concat(ar || from);
      };
      __await = function(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
      };
      __asyncGenerator = function(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
          return this;
        }, i;
        function verb(n) {
          if (g[n])
            i[n] = function(v) {
              return new Promise(function(a, b) {
                q.push([n, v, a, b]) > 1 || resume(n, v);
              });
            };
        }
        function resume(n, v) {
          try {
            step(g[n](v));
          } catch (e) {
            settle(q[0][3], e);
          }
        }
        function step(r) {
          r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
        }
        function fulfill(value) {
          resume("next", value);
        }
        function reject(value) {
          resume("throw", value);
        }
        function settle(f, v) {
          if (f(v), q.shift(), q.length)
            resume(q[0][0], q[0][1]);
        }
      };
      __asyncDelegator = function(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function(e) {
          throw e;
        }), verb("return"), i[Symbol.iterator] = function() {
          return this;
        }, i;
        function verb(n, f) {
          i[n] = o[n] ? function(v) {
            return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v;
          } : f;
        }
      };
      __asyncValues = function(o) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
          return this;
        }, i);
        function verb(n) {
          i[n] = o[n] && function(v) {
            return new Promise(function(resolve2, reject) {
              v = o[n](v), settle(resolve2, reject, v.done, v.value);
            });
          };
        }
        function settle(resolve2, reject, d2, v) {
          Promise.resolve(v).then(function(v2) {
            resolve2({ value: v2, done: d2 });
          }, reject);
        }
      };
      __makeTemplateObject = function(cooked, raw) {
        if (Object.defineProperty) {
          Object.defineProperty(cooked, "raw", { value: raw });
        } else {
          cooked.raw = raw;
        }
        return cooked;
      };
      var __setModuleDefault = Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      };
      __importStar = function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod)
            if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
              __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      __importDefault = function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      __classPrivateFieldGet = function(receiver, state, kind, f) {
        if (kind === "a" && !f)
          throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
          throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
      };
      __classPrivateFieldSet = function(receiver, state, value, kind, f) {
        if (kind === "m")
          throw new TypeError("Private method is not writable");
        if (kind === "a" && !f)
          throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
          throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
      };
      exporter("__extends", __extends);
      exporter("__assign", __assign);
      exporter("__rest", __rest);
      exporter("__decorate", __decorate);
      exporter("__param", __param);
      exporter("__metadata", __metadata);
      exporter("__awaiter", __awaiter);
      exporter("__generator", __generator);
      exporter("__exportStar", __exportStar);
      exporter("__createBinding", __createBinding);
      exporter("__values", __values);
      exporter("__read", __read);
      exporter("__spread", __spread);
      exporter("__spreadArrays", __spreadArrays);
      exporter("__spreadArray", __spreadArray);
      exporter("__await", __await);
      exporter("__asyncGenerator", __asyncGenerator);
      exporter("__asyncDelegator", __asyncDelegator);
      exporter("__asyncValues", __asyncValues);
      exporter("__makeTemplateObject", __makeTemplateObject);
      exporter("__importStar", __importStar);
      exporter("__importDefault", __importDefault);
      exporter("__classPrivateFieldGet", __classPrivateFieldGet);
      exporter("__classPrivateFieldSet", __classPrivateFieldSet);
    });
  }
});

// node_modules/@firebase/util/dist/index.node.cjs.js
var require_index_node_cjs = __commonJS({
  "node_modules/@firebase/util/dist/index.node.cjs.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib = require_tslib();
    var CONSTANTS = {
      NODE_CLIENT: false,
      NODE_ADMIN: false,
      SDK_VERSION: "${JSCORE_VERSION}"
    };
    var assert = function(assertion, message) {
      if (!assertion) {
        throw assertionError(message);
      }
    };
    var assertionError = function(message) {
      return new Error("Firebase Database (" + CONSTANTS.SDK_VERSION + ") INTERNAL ASSERT FAILED: " + message);
    };
    var stringToByteArray$1 = function(str) {
      var out = [];
      var p = 0;
      for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 128) {
          out[p++] = c;
        } else if (c < 2048) {
          out[p++] = c >> 6 | 192;
          out[p++] = c & 63 | 128;
        } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
          c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
          out[p++] = c >> 18 | 240;
          out[p++] = c >> 12 & 63 | 128;
          out[p++] = c >> 6 & 63 | 128;
          out[p++] = c & 63 | 128;
        } else {
          out[p++] = c >> 12 | 224;
          out[p++] = c >> 6 & 63 | 128;
          out[p++] = c & 63 | 128;
        }
      }
      return out;
    };
    var byteArrayToString = function(bytes) {
      var out = [];
      var pos = 0, c = 0;
      while (pos < bytes.length) {
        var c1 = bytes[pos++];
        if (c1 < 128) {
          out[c++] = String.fromCharCode(c1);
        } else if (c1 > 191 && c1 < 224) {
          var c2 = bytes[pos++];
          out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
        } else if (c1 > 239 && c1 < 365) {
          var c2 = bytes[pos++];
          var c3 = bytes[pos++];
          var c4 = bytes[pos++];
          var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
          out[c++] = String.fromCharCode(55296 + (u >> 10));
          out[c++] = String.fromCharCode(56320 + (u & 1023));
        } else {
          var c2 = bytes[pos++];
          var c3 = bytes[pos++];
          out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
        }
      }
      return out.join("");
    };
    var base64 = {
      byteToCharMap_: null,
      charToByteMap_: null,
      byteToCharMapWebSafe_: null,
      charToByteMapWebSafe_: null,
      ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      get ENCODED_VALS() {
        return this.ENCODED_VALS_BASE + "+/=";
      },
      get ENCODED_VALS_WEBSAFE() {
        return this.ENCODED_VALS_BASE + "-_.";
      },
      HAS_NATIVE_SUPPORT: typeof atob === "function",
      encodeByteArray: function(input, webSafe) {
        if (!Array.isArray(input)) {
          throw Error("encodeByteArray takes an array as a parameter");
        }
        this.init_();
        var byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
        var output = [];
        for (var i = 0; i < input.length; i += 3) {
          var byte1 = input[i];
          var haveByte2 = i + 1 < input.length;
          var byte2 = haveByte2 ? input[i + 1] : 0;
          var haveByte3 = i + 2 < input.length;
          var byte3 = haveByte3 ? input[i + 2] : 0;
          var outByte1 = byte1 >> 2;
          var outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
          var outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
          var outByte4 = byte3 & 63;
          if (!haveByte3) {
            outByte4 = 64;
            if (!haveByte2) {
              outByte3 = 64;
            }
          }
          output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
        }
        return output.join("");
      },
      encodeString: function(input, webSafe) {
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
          return btoa(input);
        }
        return this.encodeByteArray(stringToByteArray$1(input), webSafe);
      },
      decodeString: function(input, webSafe) {
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
          return atob(input);
        }
        return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
      },
      decodeStringToByteArray: function(input, webSafe) {
        this.init_();
        var charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
        var output = [];
        for (var i = 0; i < input.length; ) {
          var byte1 = charToByteMap[input.charAt(i++)];
          var haveByte2 = i < input.length;
          var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
          ++i;
          var haveByte3 = i < input.length;
          var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
          ++i;
          var haveByte4 = i < input.length;
          var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
          ++i;
          if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
            throw Error();
          }
          var outByte1 = byte1 << 2 | byte2 >> 4;
          output.push(outByte1);
          if (byte3 !== 64) {
            var outByte2 = byte2 << 4 & 240 | byte3 >> 2;
            output.push(outByte2);
            if (byte4 !== 64) {
              var outByte3 = byte3 << 6 & 192 | byte4;
              output.push(outByte3);
            }
          }
        }
        return output;
      },
      init_: function() {
        if (!this.byteToCharMap_) {
          this.byteToCharMap_ = {};
          this.charToByteMap_ = {};
          this.byteToCharMapWebSafe_ = {};
          this.charToByteMapWebSafe_ = {};
          for (var i = 0; i < this.ENCODED_VALS.length; i++) {
            this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
            this.charToByteMap_[this.byteToCharMap_[i]] = i;
            this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
            this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
            if (i >= this.ENCODED_VALS_BASE.length) {
              this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
              this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
            }
          }
        }
      }
    };
    var base64Encode = function(str) {
      var utf8Bytes = stringToByteArray$1(str);
      return base64.encodeByteArray(utf8Bytes, true);
    };
    var base64Decode = function(str) {
      try {
        return base64.decodeString(str, true);
      } catch (e) {
        console.error("base64Decode failed: ", e);
      }
      return null;
    };
    function deepCopy(value) {
      return deepExtend(void 0, value);
    }
    function deepExtend(target, source) {
      if (!(source instanceof Object)) {
        return source;
      }
      switch (source.constructor) {
        case Date:
          var dateValue = source;
          return new Date(dateValue.getTime());
        case Object:
          if (target === void 0) {
            target = {};
          }
          break;
        case Array:
          target = [];
          break;
        default:
          return source;
      }
      for (var prop in source) {
        if (!source.hasOwnProperty(prop) || !isValidKey(prop)) {
          continue;
        }
        target[prop] = deepExtend(target[prop], source[prop]);
      }
      return target;
    }
    function isValidKey(key) {
      return key !== "__proto__";
    }
    var Deferred = function() {
      function Deferred2() {
        var _this = this;
        this.reject = function() {
        };
        this.resolve = function() {
        };
        this.promise = new Promise(function(resolve2, reject) {
          _this.resolve = resolve2;
          _this.reject = reject;
        });
      }
      Deferred2.prototype.wrapCallback = function(callback) {
        var _this = this;
        return function(error3, value) {
          if (error3) {
            _this.reject(error3);
          } else {
            _this.resolve(value);
          }
          if (typeof callback === "function") {
            _this.promise.catch(function() {
            });
            if (callback.length === 1) {
              callback(error3);
            } else {
              callback(error3, value);
            }
          }
        };
      };
      return Deferred2;
    }();
    function createMockUserToken(token, projectId) {
      if (token.uid) {
        throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');
      }
      var header = {
        alg: "none",
        type: "JWT"
      };
      var project = projectId || "demo-project";
      var iat = token.iat || 0;
      var sub = token.sub || token.user_id;
      if (!sub) {
        throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");
      }
      var payload = tslib.__assign({
        iss: "https://securetoken.google.com/" + project,
        aud: project,
        iat,
        exp: iat + 3600,
        auth_time: iat,
        sub,
        user_id: sub,
        firebase: {
          sign_in_provider: "custom",
          identities: {}
        }
      }, token);
      var signature = "";
      return [
        base64.encodeString(JSON.stringify(header), false),
        base64.encodeString(JSON.stringify(payload), false),
        signature
      ].join(".");
    }
    function getUA() {
      if (typeof navigator !== "undefined" && typeof navigator["userAgent"] === "string") {
        return navigator["userAgent"];
      } else {
        return "";
      }
    }
    function isMobileCordova() {
      return typeof window !== "undefined" && !!(window["cordova"] || window["phonegap"] || window["PhoneGap"]) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA());
    }
    function isNode() {
      try {
        return Object.prototype.toString.call(global.process) === "[object process]";
      } catch (e) {
        return false;
      }
    }
    function isBrowser() {
      return typeof self === "object" && self.self === self;
    }
    function isBrowserExtension() {
      var runtime = typeof chrome === "object" ? chrome.runtime : typeof browser === "object" ? browser.runtime : void 0;
      return typeof runtime === "object" && runtime.id !== void 0;
    }
    function isReactNative() {
      return typeof navigator === "object" && navigator["product"] === "ReactNative";
    }
    function isElectron() {
      return getUA().indexOf("Electron/") >= 0;
    }
    function isIE() {
      var ua = getUA();
      return ua.indexOf("MSIE ") >= 0 || ua.indexOf("Trident/") >= 0;
    }
    function isUWP() {
      return getUA().indexOf("MSAppHost/") >= 0;
    }
    function isNodeSdk() {
      return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
    }
    function isSafari() {
      return !isNode() && navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");
    }
    function isIndexedDBAvailable() {
      return "indexedDB" in self && indexedDB != null;
    }
    function validateIndexedDBOpenable() {
      return new Promise(function(resolve2, reject) {
        try {
          var preExist_1 = true;
          var DB_CHECK_NAME_1 = "validate-browser-context-for-indexeddb-analytics-module";
          var request_1 = self.indexedDB.open(DB_CHECK_NAME_1);
          request_1.onsuccess = function() {
            request_1.result.close();
            if (!preExist_1) {
              self.indexedDB.deleteDatabase(DB_CHECK_NAME_1);
            }
            resolve2(true);
          };
          request_1.onupgradeneeded = function() {
            preExist_1 = false;
          };
          request_1.onerror = function() {
            var _a;
            reject(((_a = request_1.error) === null || _a === void 0 ? void 0 : _a.message) || "");
          };
        } catch (error3) {
          reject(error3);
        }
      });
    }
    function areCookiesEnabled() {
      if (!navigator || !navigator.cookieEnabled) {
        return false;
      }
      return true;
    }
    function getGlobal() {
      if (typeof self !== "undefined") {
        return self;
      }
      if (typeof window !== "undefined") {
        return window;
      }
      if (typeof global !== "undefined") {
        return global;
      }
      throw new Error("Unable to locate global object.");
    }
    var ERROR_NAME = "FirebaseError";
    var FirebaseError = function(_super) {
      tslib.__extends(FirebaseError2, _super);
      function FirebaseError2(code, message, customData) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.customData = customData;
        _this.name = ERROR_NAME;
        Object.setPrototypeOf(_this, FirebaseError2.prototype);
        if (Error.captureStackTrace) {
          Error.captureStackTrace(_this, ErrorFactory.prototype.create);
        }
        return _this;
      }
      return FirebaseError2;
    }(Error);
    var ErrorFactory = function() {
      function ErrorFactory2(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
      }
      ErrorFactory2.prototype.create = function(code) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
          data[_i - 1] = arguments[_i];
        }
        var customData = data[0] || {};
        var fullCode = this.service + "/" + code;
        var template2 = this.errors[code];
        var message = template2 ? replaceTemplate(template2, customData) : "Error";
        var fullMessage = this.serviceName + ": " + message + " (" + fullCode + ").";
        var error3 = new FirebaseError(fullCode, fullMessage, customData);
        return error3;
      };
      return ErrorFactory2;
    }();
    function replaceTemplate(template2, data) {
      return template2.replace(PATTERN, function(_, key) {
        var value = data[key];
        return value != null ? String(value) : "<" + key + "?>";
      });
    }
    var PATTERN = /\{\$([^}]+)}/g;
    function jsonEval(str) {
      return JSON.parse(str);
    }
    function stringify(data) {
      return JSON.stringify(data);
    }
    var decode = function(token) {
      var header = {}, claims = {}, data = {}, signature = "";
      try {
        var parts = token.split(".");
        header = jsonEval(base64Decode(parts[0]) || "");
        claims = jsonEval(base64Decode(parts[1]) || "");
        signature = parts[2];
        data = claims["d"] || {};
        delete claims["d"];
      } catch (e) {
      }
      return {
        header,
        claims,
        data,
        signature
      };
    };
    var isValidTimestamp = function(token) {
      var claims = decode(token).claims;
      var now = Math.floor(new Date().getTime() / 1e3);
      var validSince = 0, validUntil = 0;
      if (typeof claims === "object") {
        if (claims.hasOwnProperty("nbf")) {
          validSince = claims["nbf"];
        } else if (claims.hasOwnProperty("iat")) {
          validSince = claims["iat"];
        }
        if (claims.hasOwnProperty("exp")) {
          validUntil = claims["exp"];
        } else {
          validUntil = validSince + 86400;
        }
      }
      return !!now && !!validSince && !!validUntil && now >= validSince && now <= validUntil;
    };
    var issuedAtTime = function(token) {
      var claims = decode(token).claims;
      if (typeof claims === "object" && claims.hasOwnProperty("iat")) {
        return claims["iat"];
      }
      return null;
    };
    var isValidFormat = function(token) {
      var decoded = decode(token), claims = decoded.claims;
      return !!claims && typeof claims === "object" && claims.hasOwnProperty("iat");
    };
    var isAdmin = function(token) {
      var claims = decode(token).claims;
      return typeof claims === "object" && claims["admin"] === true;
    };
    function contains(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }
    function safeGet(obj, key) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
      } else {
        return void 0;
      }
    }
    function isEmpty(obj) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          return false;
        }
      }
      return true;
    }
    function map(obj, fn, contextObj) {
      var res = {};
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          res[key] = fn.call(contextObj, obj[key], key, obj);
        }
      }
      return res;
    }
    function deepEqual(a, b) {
      if (a === b) {
        return true;
      }
      var aKeys = Object.keys(a);
      var bKeys = Object.keys(b);
      for (var _i = 0, aKeys_1 = aKeys; _i < aKeys_1.length; _i++) {
        var k = aKeys_1[_i];
        if (!bKeys.includes(k)) {
          return false;
        }
        var aProp = a[k];
        var bProp = b[k];
        if (isObject(aProp) && isObject(bProp)) {
          if (!deepEqual(aProp, bProp)) {
            return false;
          }
        } else if (aProp !== bProp) {
          return false;
        }
      }
      for (var _a = 0, bKeys_1 = bKeys; _a < bKeys_1.length; _a++) {
        var k = bKeys_1[_a];
        if (!aKeys.includes(k)) {
          return false;
        }
      }
      return true;
    }
    function isObject(thing) {
      return thing !== null && typeof thing === "object";
    }
    function querystring(querystringParams) {
      var params = [];
      var _loop_1 = function(key2, value2) {
        if (Array.isArray(value2)) {
          value2.forEach(function(arrayVal) {
            params.push(encodeURIComponent(key2) + "=" + encodeURIComponent(arrayVal));
          });
        } else {
          params.push(encodeURIComponent(key2) + "=" + encodeURIComponent(value2));
        }
      };
      for (var _i = 0, _a = Object.entries(querystringParams); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        _loop_1(key, value);
      }
      return params.length ? "&" + params.join("&") : "";
    }
    function querystringDecode(querystring2) {
      var obj = {};
      var tokens = querystring2.replace(/^\?/, "").split("&");
      tokens.forEach(function(token) {
        if (token) {
          var _a = token.split("="), key = _a[0], value = _a[1];
          obj[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
      return obj;
    }
    function extractQuerystring(url) {
      var queryStart = url.indexOf("?");
      if (!queryStart) {
        return "";
      }
      var fragmentStart = url.indexOf("#", queryStart);
      return url.substring(queryStart, fragmentStart > 0 ? fragmentStart : void 0);
    }
    var Sha1 = function() {
      function Sha12() {
        this.chain_ = [];
        this.buf_ = [];
        this.W_ = [];
        this.pad_ = [];
        this.inbuf_ = 0;
        this.total_ = 0;
        this.blockSize = 512 / 8;
        this.pad_[0] = 128;
        for (var i = 1; i < this.blockSize; ++i) {
          this.pad_[i] = 0;
        }
        this.reset();
      }
      Sha12.prototype.reset = function() {
        this.chain_[0] = 1732584193;
        this.chain_[1] = 4023233417;
        this.chain_[2] = 2562383102;
        this.chain_[3] = 271733878;
        this.chain_[4] = 3285377520;
        this.inbuf_ = 0;
        this.total_ = 0;
      };
      Sha12.prototype.compress_ = function(buf, offset) {
        if (!offset) {
          offset = 0;
        }
        var W = this.W_;
        if (typeof buf === "string") {
          for (var i = 0; i < 16; i++) {
            W[i] = buf.charCodeAt(offset) << 24 | buf.charCodeAt(offset + 1) << 16 | buf.charCodeAt(offset + 2) << 8 | buf.charCodeAt(offset + 3);
            offset += 4;
          }
        } else {
          for (var i = 0; i < 16; i++) {
            W[i] = buf[offset] << 24 | buf[offset + 1] << 16 | buf[offset + 2] << 8 | buf[offset + 3];
            offset += 4;
          }
        }
        for (var i = 16; i < 80; i++) {
          var t = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
          W[i] = (t << 1 | t >>> 31) & 4294967295;
        }
        var a = this.chain_[0];
        var b = this.chain_[1];
        var c = this.chain_[2];
        var d2 = this.chain_[3];
        var e = this.chain_[4];
        var f, k;
        for (var i = 0; i < 80; i++) {
          if (i < 40) {
            if (i < 20) {
              f = d2 ^ b & (c ^ d2);
              k = 1518500249;
            } else {
              f = b ^ c ^ d2;
              k = 1859775393;
            }
          } else {
            if (i < 60) {
              f = b & c | d2 & (b | c);
              k = 2400959708;
            } else {
              f = b ^ c ^ d2;
              k = 3395469782;
            }
          }
          var t = (a << 5 | a >>> 27) + f + e + k + W[i] & 4294967295;
          e = d2;
          d2 = c;
          c = (b << 30 | b >>> 2) & 4294967295;
          b = a;
          a = t;
        }
        this.chain_[0] = this.chain_[0] + a & 4294967295;
        this.chain_[1] = this.chain_[1] + b & 4294967295;
        this.chain_[2] = this.chain_[2] + c & 4294967295;
        this.chain_[3] = this.chain_[3] + d2 & 4294967295;
        this.chain_[4] = this.chain_[4] + e & 4294967295;
      };
      Sha12.prototype.update = function(bytes, length) {
        if (bytes == null) {
          return;
        }
        if (length === void 0) {
          length = bytes.length;
        }
        var lengthMinusBlock = length - this.blockSize;
        var n = 0;
        var buf = this.buf_;
        var inbuf = this.inbuf_;
        while (n < length) {
          if (inbuf === 0) {
            while (n <= lengthMinusBlock) {
              this.compress_(bytes, n);
              n += this.blockSize;
            }
          }
          if (typeof bytes === "string") {
            while (n < length) {
              buf[inbuf] = bytes.charCodeAt(n);
              ++inbuf;
              ++n;
              if (inbuf === this.blockSize) {
                this.compress_(buf);
                inbuf = 0;
                break;
              }
            }
          } else {
            while (n < length) {
              buf[inbuf] = bytes[n];
              ++inbuf;
              ++n;
              if (inbuf === this.blockSize) {
                this.compress_(buf);
                inbuf = 0;
                break;
              }
            }
          }
        }
        this.inbuf_ = inbuf;
        this.total_ += length;
      };
      Sha12.prototype.digest = function() {
        var digest = [];
        var totalBits = this.total_ * 8;
        if (this.inbuf_ < 56) {
          this.update(this.pad_, 56 - this.inbuf_);
        } else {
          this.update(this.pad_, this.blockSize - (this.inbuf_ - 56));
        }
        for (var i = this.blockSize - 1; i >= 56; i--) {
          this.buf_[i] = totalBits & 255;
          totalBits /= 256;
        }
        this.compress_(this.buf_);
        var n = 0;
        for (var i = 0; i < 5; i++) {
          for (var j = 24; j >= 0; j -= 8) {
            digest[n] = this.chain_[i] >> j & 255;
            ++n;
          }
        }
        return digest;
      };
      return Sha12;
    }();
    function createSubscribe(executor, onNoObservers) {
      var proxy = new ObserverProxy(executor, onNoObservers);
      return proxy.subscribe.bind(proxy);
    }
    var ObserverProxy = function() {
      function ObserverProxy2(executor, onNoObservers) {
        var _this = this;
        this.observers = [];
        this.unsubscribes = [];
        this.observerCount = 0;
        this.task = Promise.resolve();
        this.finalized = false;
        this.onNoObservers = onNoObservers;
        this.task.then(function() {
          executor(_this);
        }).catch(function(e) {
          _this.error(e);
        });
      }
      ObserverProxy2.prototype.next = function(value) {
        this.forEachObserver(function(observer) {
          observer.next(value);
        });
      };
      ObserverProxy2.prototype.error = function(error3) {
        this.forEachObserver(function(observer) {
          observer.error(error3);
        });
        this.close(error3);
      };
      ObserverProxy2.prototype.complete = function() {
        this.forEachObserver(function(observer) {
          observer.complete();
        });
        this.close();
      };
      ObserverProxy2.prototype.subscribe = function(nextOrObserver, error3, complete) {
        var _this = this;
        var observer;
        if (nextOrObserver === void 0 && error3 === void 0 && complete === void 0) {
          throw new Error("Missing Observer.");
        }
        if (implementsAnyMethods(nextOrObserver, [
          "next",
          "error",
          "complete"
        ])) {
          observer = nextOrObserver;
        } else {
          observer = {
            next: nextOrObserver,
            error: error3,
            complete
          };
        }
        if (observer.next === void 0) {
          observer.next = noop2;
        }
        if (observer.error === void 0) {
          observer.error = noop2;
        }
        if (observer.complete === void 0) {
          observer.complete = noop2;
        }
        var unsub = this.unsubscribeOne.bind(this, this.observers.length);
        if (this.finalized) {
          this.task.then(function() {
            try {
              if (_this.finalError) {
                observer.error(_this.finalError);
              } else {
                observer.complete();
              }
            } catch (e) {
            }
            return;
          });
        }
        this.observers.push(observer);
        return unsub;
      };
      ObserverProxy2.prototype.unsubscribeOne = function(i) {
        if (this.observers === void 0 || this.observers[i] === void 0) {
          return;
        }
        delete this.observers[i];
        this.observerCount -= 1;
        if (this.observerCount === 0 && this.onNoObservers !== void 0) {
          this.onNoObservers(this);
        }
      };
      ObserverProxy2.prototype.forEachObserver = function(fn) {
        if (this.finalized) {
          return;
        }
        for (var i = 0; i < this.observers.length; i++) {
          this.sendOne(i, fn);
        }
      };
      ObserverProxy2.prototype.sendOne = function(i, fn) {
        var _this = this;
        this.task.then(function() {
          if (_this.observers !== void 0 && _this.observers[i] !== void 0) {
            try {
              fn(_this.observers[i]);
            } catch (e) {
              if (typeof console !== "undefined" && console.error) {
                console.error(e);
              }
            }
          }
        });
      };
      ObserverProxy2.prototype.close = function(err) {
        var _this = this;
        if (this.finalized) {
          return;
        }
        this.finalized = true;
        if (err !== void 0) {
          this.finalError = err;
        }
        this.task.then(function() {
          _this.observers = void 0;
          _this.onNoObservers = void 0;
        });
      };
      return ObserverProxy2;
    }();
    function async(fn, onError) {
      return function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        Promise.resolve(true).then(function() {
          fn.apply(void 0, args);
        }).catch(function(error3) {
          if (onError) {
            onError(error3);
          }
        });
      };
    }
    function implementsAnyMethods(obj, methods) {
      if (typeof obj !== "object" || obj === null) {
        return false;
      }
      for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
        var method = methods_1[_i];
        if (method in obj && typeof obj[method] === "function") {
          return true;
        }
      }
      return false;
    }
    function noop2() {
    }
    var validateArgCount = function(fnName, minCount, maxCount, argCount) {
      var argError;
      if (argCount < minCount) {
        argError = "at least " + minCount;
      } else if (argCount > maxCount) {
        argError = maxCount === 0 ? "none" : "no more than " + maxCount;
      }
      if (argError) {
        var error3 = fnName + " failed: Was called with " + argCount + (argCount === 1 ? " argument." : " arguments.") + " Expects " + argError + ".";
        throw new Error(error3);
      }
    };
    function errorPrefix(fnName, argName) {
      return fnName + " failed: " + argName + " argument ";
    }
    function validateNamespace(fnName, namespace, optional) {
      if (optional && !namespace) {
        return;
      }
      if (typeof namespace !== "string") {
        throw new Error(errorPrefix(fnName, "namespace") + "must be a valid firebase namespace.");
      }
    }
    function validateCallback(fnName, argumentName, callback, optional) {
      if (optional && !callback) {
        return;
      }
      if (typeof callback !== "function") {
        throw new Error(errorPrefix(fnName, argumentName) + "must be a valid function.");
      }
    }
    function validateContextObject(fnName, argumentName, context, optional) {
      if (optional && !context) {
        return;
      }
      if (typeof context !== "object" || context === null) {
        throw new Error(errorPrefix(fnName, argumentName) + "must be a valid context object.");
      }
    }
    var stringToByteArray = function(str) {
      var out = [];
      var p = 0;
      for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c >= 55296 && c <= 56319) {
          var high = c - 55296;
          i++;
          assert(i < str.length, "Surrogate pair missing trail surrogate.");
          var low = str.charCodeAt(i) - 56320;
          c = 65536 + (high << 10) + low;
        }
        if (c < 128) {
          out[p++] = c;
        } else if (c < 2048) {
          out[p++] = c >> 6 | 192;
          out[p++] = c & 63 | 128;
        } else if (c < 65536) {
          out[p++] = c >> 12 | 224;
          out[p++] = c >> 6 & 63 | 128;
          out[p++] = c & 63 | 128;
        } else {
          out[p++] = c >> 18 | 240;
          out[p++] = c >> 12 & 63 | 128;
          out[p++] = c >> 6 & 63 | 128;
          out[p++] = c & 63 | 128;
        }
      }
      return out;
    };
    var stringLength = function(str) {
      var p = 0;
      for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 128) {
          p++;
        } else if (c < 2048) {
          p += 2;
        } else if (c >= 55296 && c <= 56319) {
          p += 4;
          i++;
        } else {
          p += 3;
        }
      }
      return p;
    };
    var DEFAULT_INTERVAL_MILLIS = 1e3;
    var DEFAULT_BACKOFF_FACTOR = 2;
    var MAX_VALUE_MILLIS = 4 * 60 * 60 * 1e3;
    var RANDOM_FACTOR = 0.5;
    function calculateBackoffMillis(backoffCount, intervalMillis, backoffFactor) {
      if (intervalMillis === void 0) {
        intervalMillis = DEFAULT_INTERVAL_MILLIS;
      }
      if (backoffFactor === void 0) {
        backoffFactor = DEFAULT_BACKOFF_FACTOR;
      }
      var currBaseValue = intervalMillis * Math.pow(backoffFactor, backoffCount);
      var randomWait = Math.round(RANDOM_FACTOR * currBaseValue * (Math.random() - 0.5) * 2);
      return Math.min(MAX_VALUE_MILLIS, currBaseValue + randomWait);
    }
    function ordinal(i) {
      if (!Number.isFinite(i)) {
        return "" + i;
      }
      return i + indicator(i);
    }
    function indicator(i) {
      i = Math.abs(i);
      var cent = i % 100;
      if (cent >= 10 && cent <= 20) {
        return "th";
      }
      var dec = i % 10;
      if (dec === 1) {
        return "st";
      }
      if (dec === 2) {
        return "nd";
      }
      if (dec === 3) {
        return "rd";
      }
      return "th";
    }
    function getModularInstance(service) {
      if (service && service._delegate) {
        return service._delegate;
      } else {
        return service;
      }
    }
    CONSTANTS.NODE_CLIENT = true;
    exports.CONSTANTS = CONSTANTS;
    exports.Deferred = Deferred;
    exports.ErrorFactory = ErrorFactory;
    exports.FirebaseError = FirebaseError;
    exports.MAX_VALUE_MILLIS = MAX_VALUE_MILLIS;
    exports.RANDOM_FACTOR = RANDOM_FACTOR;
    exports.Sha1 = Sha1;
    exports.areCookiesEnabled = areCookiesEnabled;
    exports.assert = assert;
    exports.assertionError = assertionError;
    exports.async = async;
    exports.base64 = base64;
    exports.base64Decode = base64Decode;
    exports.base64Encode = base64Encode;
    exports.calculateBackoffMillis = calculateBackoffMillis;
    exports.contains = contains;
    exports.createMockUserToken = createMockUserToken;
    exports.createSubscribe = createSubscribe;
    exports.decode = decode;
    exports.deepCopy = deepCopy;
    exports.deepEqual = deepEqual;
    exports.deepExtend = deepExtend;
    exports.errorPrefix = errorPrefix;
    exports.extractQuerystring = extractQuerystring;
    exports.getGlobal = getGlobal;
    exports.getModularInstance = getModularInstance;
    exports.getUA = getUA;
    exports.isAdmin = isAdmin;
    exports.isBrowser = isBrowser;
    exports.isBrowserExtension = isBrowserExtension;
    exports.isElectron = isElectron;
    exports.isEmpty = isEmpty;
    exports.isIE = isIE;
    exports.isIndexedDBAvailable = isIndexedDBAvailable;
    exports.isMobileCordova = isMobileCordova;
    exports.isNode = isNode;
    exports.isNodeSdk = isNodeSdk;
    exports.isReactNative = isReactNative;
    exports.isSafari = isSafari;
    exports.isUWP = isUWP;
    exports.isValidFormat = isValidFormat;
    exports.isValidTimestamp = isValidTimestamp;
    exports.issuedAtTime = issuedAtTime;
    exports.jsonEval = jsonEval;
    exports.map = map;
    exports.ordinal = ordinal;
    exports.querystring = querystring;
    exports.querystringDecode = querystringDecode;
    exports.safeGet = safeGet;
    exports.stringLength = stringLength;
    exports.stringToByteArray = stringToByteArray;
    exports.stringify = stringify;
    exports.validateArgCount = validateArgCount;
    exports.validateCallback = validateCallback;
    exports.validateContextObject = validateContextObject;
    exports.validateIndexedDBOpenable = validateIndexedDBOpenable;
    exports.validateNamespace = validateNamespace;
  }
});

// node_modules/@firebase/component/dist/index.cjs.js
var require_index_cjs = __commonJS({
  "node_modules/@firebase/component/dist/index.cjs.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib = require_tslib();
    var util = require_index_node_cjs();
    var Component = function() {
      function Component2(name, instanceFactory, type) {
        this.name = name;
        this.instanceFactory = instanceFactory;
        this.type = type;
        this.multipleInstances = false;
        this.serviceProps = {};
        this.instantiationMode = "LAZY";
        this.onInstanceCreated = null;
      }
      Component2.prototype.setInstantiationMode = function(mode) {
        this.instantiationMode = mode;
        return this;
      };
      Component2.prototype.setMultipleInstances = function(multipleInstances) {
        this.multipleInstances = multipleInstances;
        return this;
      };
      Component2.prototype.setServiceProps = function(props) {
        this.serviceProps = props;
        return this;
      };
      Component2.prototype.setInstanceCreatedCallback = function(callback) {
        this.onInstanceCreated = callback;
        return this;
      };
      return Component2;
    }();
    var DEFAULT_ENTRY_NAME = "[DEFAULT]";
    var Provider = function() {
      function Provider2(name, container) {
        this.name = name;
        this.container = container;
        this.component = null;
        this.instances = new Map();
        this.instancesDeferred = new Map();
        this.onInitCallbacks = new Map();
      }
      Provider2.prototype.get = function(identifier) {
        var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        if (!this.instancesDeferred.has(normalizedIdentifier)) {
          var deferred = new util.Deferred();
          this.instancesDeferred.set(normalizedIdentifier, deferred);
          if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
            try {
              var instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier
              });
              if (instance) {
                deferred.resolve(instance);
              }
            } catch (e) {
            }
          }
        }
        return this.instancesDeferred.get(normalizedIdentifier).promise;
      };
      Provider2.prototype.getImmediate = function(options2) {
        var _a;
        var normalizedIdentifier = this.normalizeInstanceIdentifier(options2 === null || options2 === void 0 ? void 0 : options2.identifier);
        var optional = (_a = options2 === null || options2 === void 0 ? void 0 : options2.optional) !== null && _a !== void 0 ? _a : false;
        if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
          try {
            return this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
          } catch (e) {
            if (optional) {
              return null;
            } else {
              throw e;
            }
          }
        } else {
          if (optional) {
            return null;
          } else {
            throw Error("Service " + this.name + " is not available");
          }
        }
      };
      Provider2.prototype.getComponent = function() {
        return this.component;
      };
      Provider2.prototype.setComponent = function(component) {
        var e_1, _a;
        if (component.name !== this.name) {
          throw Error("Mismatching Component " + component.name + " for Provider " + this.name + ".");
        }
        if (this.component) {
          throw Error("Component for " + this.name + " has already been provided");
        }
        this.component = component;
        if (!this.shouldAutoInitialize()) {
          return;
        }
        if (isComponentEager(component)) {
          try {
            this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME });
          } catch (e) {
          }
        }
        try {
          for (var _b = tslib.__values(this.instancesDeferred.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = tslib.__read(_c.value, 2), instanceIdentifier = _d[0], instanceDeferred = _d[1];
            var normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
            try {
              var instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier
              });
              instanceDeferred.resolve(instance);
            } catch (e) {
            }
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return))
              _a.call(_b);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
      };
      Provider2.prototype.clearInstance = function(identifier) {
        if (identifier === void 0) {
          identifier = DEFAULT_ENTRY_NAME;
        }
        this.instancesDeferred.delete(identifier);
        this.instances.delete(identifier);
      };
      Provider2.prototype.delete = function() {
        return tslib.__awaiter(this, void 0, void 0, function() {
          var services;
          return tslib.__generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                services = Array.from(this.instances.values());
                return [4, Promise.all(tslib.__spreadArray(tslib.__spreadArray([], tslib.__read(services.filter(function(service) {
                  return "INTERNAL" in service;
                }).map(function(service) {
                  return service.INTERNAL.delete();
                }))), tslib.__read(services.filter(function(service) {
                  return "_delete" in service;
                }).map(function(service) {
                  return service._delete();
                }))))];
              case 1:
                _a.sent();
                return [2];
            }
          });
        });
      };
      Provider2.prototype.isComponentSet = function() {
        return this.component != null;
      };
      Provider2.prototype.isInitialized = function(identifier) {
        if (identifier === void 0) {
          identifier = DEFAULT_ENTRY_NAME;
        }
        return this.instances.has(identifier);
      };
      Provider2.prototype.initialize = function(opts) {
        var e_2, _a;
        if (opts === void 0) {
          opts = {};
        }
        var _b = opts.options, options2 = _b === void 0 ? {} : _b;
        var normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
        if (this.isInitialized(normalizedIdentifier)) {
          throw Error(this.name + "(" + normalizedIdentifier + ") has already been initialized");
        }
        if (!this.isComponentSet()) {
          throw Error("Component " + this.name + " has not been registered yet");
        }
        var instance = this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier,
          options: options2
        });
        try {
          for (var _c = tslib.__values(this.instancesDeferred.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var _e = tslib.__read(_d.value, 2), instanceIdentifier = _e[0], instanceDeferred = _e[1];
            var normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
            if (normalizedIdentifier === normalizedDeferredIdentifier) {
              instanceDeferred.resolve(instance);
            }
          }
        } catch (e_2_1) {
          e_2 = { error: e_2_1 };
        } finally {
          try {
            if (_d && !_d.done && (_a = _c.return))
              _a.call(_c);
          } finally {
            if (e_2)
              throw e_2.error;
          }
        }
        return instance;
      };
      Provider2.prototype.onInit = function(callback, identifier) {
        var _a;
        var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        var existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : new Set();
        existingCallbacks.add(callback);
        this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
        var existingInstance = this.instances.get(normalizedIdentifier);
        if (existingInstance) {
          callback(existingInstance, normalizedIdentifier);
        }
        return function() {
          existingCallbacks.delete(callback);
        };
      };
      Provider2.prototype.invokeOnInitCallbacks = function(instance, identifier) {
        var e_3, _a;
        var callbacks = this.onInitCallbacks.get(identifier);
        if (!callbacks) {
          return;
        }
        try {
          for (var callbacks_1 = tslib.__values(callbacks), callbacks_1_1 = callbacks_1.next(); !callbacks_1_1.done; callbacks_1_1 = callbacks_1.next()) {
            var callback = callbacks_1_1.value;
            try {
              callback(instance, identifier);
            } catch (_b) {
            }
          }
        } catch (e_3_1) {
          e_3 = { error: e_3_1 };
        } finally {
          try {
            if (callbacks_1_1 && !callbacks_1_1.done && (_a = callbacks_1.return))
              _a.call(callbacks_1);
          } finally {
            if (e_3)
              throw e_3.error;
          }
        }
      };
      Provider2.prototype.getOrInitializeService = function(_a) {
        var instanceIdentifier = _a.instanceIdentifier, _b = _a.options, options2 = _b === void 0 ? {} : _b;
        var instance = this.instances.get(instanceIdentifier);
        if (!instance && this.component) {
          instance = this.component.instanceFactory(this.container, {
            instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
            options: options2
          });
          this.instances.set(instanceIdentifier, instance);
          this.invokeOnInitCallbacks(instance, instanceIdentifier);
          if (this.component.onInstanceCreated) {
            try {
              this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
            } catch (_c) {
            }
          }
        }
        return instance || null;
      };
      Provider2.prototype.normalizeInstanceIdentifier = function(identifier) {
        if (identifier === void 0) {
          identifier = DEFAULT_ENTRY_NAME;
        }
        if (this.component) {
          return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
        } else {
          return identifier;
        }
      };
      Provider2.prototype.shouldAutoInitialize = function() {
        return !!this.component && this.component.instantiationMode !== "EXPLICIT";
      };
      return Provider2;
    }();
    function normalizeIdentifierForFactory(identifier) {
      return identifier === DEFAULT_ENTRY_NAME ? void 0 : identifier;
    }
    function isComponentEager(component) {
      return component.instantiationMode === "EAGER";
    }
    var ComponentContainer = function() {
      function ComponentContainer2(name) {
        this.name = name;
        this.providers = new Map();
      }
      ComponentContainer2.prototype.addComponent = function(component) {
        var provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
          throw new Error("Component " + component.name + " has already been registered with " + this.name);
        }
        provider.setComponent(component);
      };
      ComponentContainer2.prototype.addOrOverwriteComponent = function(component) {
        var provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
          this.providers.delete(component.name);
        }
        this.addComponent(component);
      };
      ComponentContainer2.prototype.getProvider = function(name) {
        if (this.providers.has(name)) {
          return this.providers.get(name);
        }
        var provider = new Provider(name, this);
        this.providers.set(name, provider);
        return provider;
      };
      ComponentContainer2.prototype.getProviders = function() {
        return Array.from(this.providers.values());
      };
      return ComponentContainer2;
    }();
    exports.Component = Component;
    exports.ComponentContainer = ComponentContainer;
    exports.Provider = Provider;
  }
});

// node_modules/@firebase/logger/dist/index.cjs.js
var require_index_cjs2 = __commonJS({
  "node_modules/@firebase/logger/dist/index.cjs.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function __spreadArrays() {
      for (var s2 = 0, i = 0, il = arguments.length; i < il; i++)
        s2 += arguments[i].length;
      for (var r = Array(s2), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
          r[k] = a[j];
      return r;
    }
    var _a;
    var instances = [];
    (function(LogLevel) {
      LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
      LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
      LogLevel[LogLevel["INFO"] = 2] = "INFO";
      LogLevel[LogLevel["WARN"] = 3] = "WARN";
      LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
      LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(exports.LogLevel || (exports.LogLevel = {}));
    var levelStringToEnum = {
      "debug": exports.LogLevel.DEBUG,
      "verbose": exports.LogLevel.VERBOSE,
      "info": exports.LogLevel.INFO,
      "warn": exports.LogLevel.WARN,
      "error": exports.LogLevel.ERROR,
      "silent": exports.LogLevel.SILENT
    };
    var defaultLogLevel = exports.LogLevel.INFO;
    var ConsoleMethod = (_a = {}, _a[exports.LogLevel.DEBUG] = "log", _a[exports.LogLevel.VERBOSE] = "log", _a[exports.LogLevel.INFO] = "info", _a[exports.LogLevel.WARN] = "warn", _a[exports.LogLevel.ERROR] = "error", _a);
    var defaultLogHandler = function(instance, logType) {
      var args = [];
      for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
      }
      if (logType < instance.logLevel) {
        return;
      }
      var now = new Date().toISOString();
      var method = ConsoleMethod[logType];
      if (method) {
        console[method].apply(console, __spreadArrays(["[" + now + "]  " + instance.name + ":"], args));
      } else {
        throw new Error("Attempted to log a message with an invalid logType (value: " + logType + ")");
      }
    };
    var Logger = function() {
      function Logger2(name) {
        this.name = name;
        this._logLevel = defaultLogLevel;
        this._logHandler = defaultLogHandler;
        this._userLogHandler = null;
        instances.push(this);
      }
      Object.defineProperty(Logger2.prototype, "logLevel", {
        get: function() {
          return this._logLevel;
        },
        set: function(val) {
          if (!(val in exports.LogLevel)) {
            throw new TypeError('Invalid value "' + val + '" assigned to `logLevel`');
          }
          this._logLevel = val;
        },
        enumerable: false,
        configurable: true
      });
      Logger2.prototype.setLogLevel = function(val) {
        this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
      };
      Object.defineProperty(Logger2.prototype, "logHandler", {
        get: function() {
          return this._logHandler;
        },
        set: function(val) {
          if (typeof val !== "function") {
            throw new TypeError("Value assigned to `logHandler` must be a function");
          }
          this._logHandler = val;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Logger2.prototype, "userLogHandler", {
        get: function() {
          return this._userLogHandler;
        },
        set: function(val) {
          this._userLogHandler = val;
        },
        enumerable: false,
        configurable: true
      });
      Logger2.prototype.debug = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, exports.LogLevel.DEBUG], args));
        this._logHandler.apply(this, __spreadArrays([this, exports.LogLevel.DEBUG], args));
      };
      Logger2.prototype.log = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, exports.LogLevel.VERBOSE], args));
        this._logHandler.apply(this, __spreadArrays([this, exports.LogLevel.VERBOSE], args));
      };
      Logger2.prototype.info = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, exports.LogLevel.INFO], args));
        this._logHandler.apply(this, __spreadArrays([this, exports.LogLevel.INFO], args));
      };
      Logger2.prototype.warn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, exports.LogLevel.WARN], args));
        this._logHandler.apply(this, __spreadArrays([this, exports.LogLevel.WARN], args));
      };
      Logger2.prototype.error = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, exports.LogLevel.ERROR], args));
        this._logHandler.apply(this, __spreadArrays([this, exports.LogLevel.ERROR], args));
      };
      return Logger2;
    }();
    function setLogLevel(level) {
      instances.forEach(function(inst) {
        inst.setLogLevel(level);
      });
    }
    function setUserLogHandler(logCallback, options2) {
      var _loop_1 = function(instance2) {
        var customLogLevel = null;
        if (options2 && options2.level) {
          customLogLevel = levelStringToEnum[options2.level];
        }
        if (logCallback === null) {
          instance2.userLogHandler = null;
        } else {
          instance2.userLogHandler = function(instance3, level) {
            var args = [];
            for (var _i2 = 2; _i2 < arguments.length; _i2++) {
              args[_i2 - 2] = arguments[_i2];
            }
            var message = args.map(function(arg) {
              if (arg == null) {
                return null;
              } else if (typeof arg === "string") {
                return arg;
              } else if (typeof arg === "number" || typeof arg === "boolean") {
                return arg.toString();
              } else if (arg instanceof Error) {
                return arg.message;
              } else {
                try {
                  return JSON.stringify(arg);
                } catch (ignored) {
                  return null;
                }
              }
            }).filter(function(arg) {
              return arg;
            }).join(" ");
            if (level >= (customLogLevel !== null && customLogLevel !== void 0 ? customLogLevel : instance3.logLevel)) {
              logCallback({
                level: exports.LogLevel[level].toLowerCase(),
                message,
                args,
                type: instance3.name
              });
            }
          };
        }
      };
      for (var _i = 0, instances_1 = instances; _i < instances_1.length; _i++) {
        var instance = instances_1[_i];
        _loop_1(instance);
      }
    }
    exports.Logger = Logger;
    exports.setLogLevel = setLogLevel;
    exports.setUserLogHandler = setUserLogHandler;
  }
});

// node_modules/dom-storage/lib/index.js
var require_lib = __commonJS({
  "node_modules/dom-storage/lib/index.js"(exports, module2) {
    init_shims();
    (function() {
      "use strict";
      var fs = require("fs");
      function Storage(path, opts) {
        opts = opts || {};
        var db;
        Object.defineProperty(this, "___priv_bk___", {
          value: {
            path
          },
          writable: false,
          enumerable: false
        });
        Object.defineProperty(this, "___priv_strict___", {
          value: !!opts.strict,
          writable: false,
          enumerable: false
        });
        Object.defineProperty(this, "___priv_ws___", {
          value: opts.ws || "  ",
          writable: false,
          enumerable: false
        });
        try {
          db = JSON.parse(fs.readFileSync(path));
        } catch (e) {
          db = {};
        }
        Object.keys(db).forEach(function(key) {
          this[key] = db[key];
        }, this);
      }
      Storage.prototype.getItem = function(key) {
        if (this.hasOwnProperty(key)) {
          if (this.___priv_strict___) {
            return String(this[key]);
          } else {
            return this[key];
          }
        }
        return null;
      };
      Storage.prototype.setItem = function(key, val) {
        if (val === void 0) {
          this[key] = null;
        } else if (this.___priv_strict___) {
          this[key] = String(val);
        } else {
          this[key] = val;
        }
        this.___save___();
      };
      Storage.prototype.removeItem = function(key) {
        delete this[key];
        this.___save___();
      };
      Storage.prototype.clear = function() {
        var self2 = this;
        Object.keys(self2).forEach(function(key) {
          self2[key] = void 0;
          delete self2[key];
        });
      };
      Storage.prototype.key = function(i) {
        i = i || 0;
        return Object.keys(this)[i];
      };
      Object.defineProperty(Storage.prototype, "length", {
        get: function() {
          return Object.keys(this).length;
        }
      });
      Storage.prototype.___save___ = function() {
        var self2 = this;
        if (!this.___priv_bk___.path) {
          return;
        }
        if (this.___priv_bk___.lock) {
          this.___priv_bk___.wait = true;
          return;
        }
        this.___priv_bk___.lock = true;
        fs.writeFile(this.___priv_bk___.path, JSON.stringify(this, null, this.___priv_ws___), "utf8", function(e) {
          self2.___priv_bk___.lock = false;
          if (e) {
            console.error("Could not write to database", self2.___priv_bk___.path);
            console.error(e);
            return;
          }
          if (self2.___priv_bk___.wait) {
            self2.___priv_bk___.wait = false;
            self2.___save___();
          }
        });
      };
      Object.defineProperty(Storage, "create", {
        value: function(path, opts) {
          return new Storage(path, opts);
        },
        writable: false,
        enumerable: false
      });
      module2.exports = Storage;
    })();
  }
});

// node_modules/xmlhttprequest/lib/XMLHttpRequest.js
var require_XMLHttpRequest = __commonJS({
  "node_modules/xmlhttprequest/lib/XMLHttpRequest.js"(exports) {
    init_shims();
    var Url = require("url");
    var spawn = require("child_process").spawn;
    var fs = require("fs");
    exports.XMLHttpRequest = function() {
      "use strict";
      var self2 = this;
      var http2 = require("http");
      var https2 = require("https");
      var request;
      var response;
      var settings = {};
      var disableHeaderCheck = false;
      var defaultHeaders = {
        "User-Agent": "node-XMLHttpRequest",
        "Accept": "*/*"
      };
      var headers = {};
      var headersCase = {};
      var forbiddenRequestHeaders = [
        "accept-charset",
        "accept-encoding",
        "access-control-request-headers",
        "access-control-request-method",
        "connection",
        "content-length",
        "content-transfer-encoding",
        "cookie",
        "cookie2",
        "date",
        "expect",
        "host",
        "keep-alive",
        "origin",
        "referer",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "via"
      ];
      var forbiddenRequestMethods = [
        "TRACE",
        "TRACK",
        "CONNECT"
      ];
      var sendFlag = false;
      var errorFlag = false;
      var listeners = {};
      this.UNSENT = 0;
      this.OPENED = 1;
      this.HEADERS_RECEIVED = 2;
      this.LOADING = 3;
      this.DONE = 4;
      this.readyState = this.UNSENT;
      this.onreadystatechange = null;
      this.responseText = "";
      this.responseXML = "";
      this.status = null;
      this.statusText = null;
      this.withCredentials = false;
      var isAllowedHttpHeader = function(header) {
        return disableHeaderCheck || header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1;
      };
      var isAllowedHttpMethod = function(method) {
        return method && forbiddenRequestMethods.indexOf(method) === -1;
      };
      this.open = function(method, url, async, user, password) {
        this.abort();
        errorFlag = false;
        if (!isAllowedHttpMethod(method)) {
          throw new Error("SecurityError: Request method not allowed");
        }
        settings = {
          "method": method,
          "url": url.toString(),
          "async": typeof async !== "boolean" ? true : async,
          "user": user || null,
          "password": password || null
        };
        setState(this.OPENED);
      };
      this.setDisableHeaderCheck = function(state) {
        disableHeaderCheck = state;
      };
      this.setRequestHeader = function(header, value) {
        if (this.readyState !== this.OPENED) {
          throw new Error("INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN");
        }
        if (!isAllowedHttpHeader(header)) {
          console.warn('Refused to set unsafe header "' + header + '"');
          return;
        }
        if (sendFlag) {
          throw new Error("INVALID_STATE_ERR: send flag is true");
        }
        header = headersCase[header.toLowerCase()] || header;
        headersCase[header.toLowerCase()] = header;
        headers[header] = headers[header] ? headers[header] + ", " + value : value;
      };
      this.getResponseHeader = function(header) {
        if (typeof header === "string" && this.readyState > this.OPENED && response && response.headers && response.headers[header.toLowerCase()] && !errorFlag) {
          return response.headers[header.toLowerCase()];
        }
        return null;
      };
      this.getAllResponseHeaders = function() {
        if (this.readyState < this.HEADERS_RECEIVED || errorFlag) {
          return "";
        }
        var result = "";
        for (var i in response.headers) {
          if (i !== "set-cookie" && i !== "set-cookie2") {
            result += i + ": " + response.headers[i] + "\r\n";
          }
        }
        return result.substr(0, result.length - 2);
      };
      this.getRequestHeader = function(name) {
        if (typeof name === "string" && headersCase[name.toLowerCase()]) {
          return headers[headersCase[name.toLowerCase()]];
        }
        return "";
      };
      this.send = function(data) {
        if (this.readyState !== this.OPENED) {
          throw new Error("INVALID_STATE_ERR: connection must be opened before send() is called");
        }
        if (sendFlag) {
          throw new Error("INVALID_STATE_ERR: send has already been called");
        }
        var ssl = false, local = false;
        var url = Url.parse(settings.url);
        var host;
        switch (url.protocol) {
          case "https:":
            ssl = true;
          case "http:":
            host = url.hostname;
            break;
          case "file:":
            local = true;
            break;
          case void 0:
          case null:
          case "":
            host = "localhost";
            break;
          default:
            throw new Error("Protocol not supported.");
        }
        if (local) {
          if (settings.method !== "GET") {
            throw new Error("XMLHttpRequest: Only GET method is supported");
          }
          if (settings.async) {
            fs.readFile(url.pathname, "utf8", function(error3, data2) {
              if (error3) {
                self2.handleError(error3);
              } else {
                self2.status = 200;
                self2.responseText = data2;
                setState(self2.DONE);
              }
            });
          } else {
            try {
              this.responseText = fs.readFileSync(url.pathname, "utf8");
              this.status = 200;
              setState(self2.DONE);
            } catch (e) {
              this.handleError(e);
            }
          }
          return;
        }
        var port = url.port || (ssl ? 443 : 80);
        var uri = url.pathname + (url.search ? url.search : "");
        for (var name in defaultHeaders) {
          if (!headersCase[name.toLowerCase()]) {
            headers[name] = defaultHeaders[name];
          }
        }
        headers.Host = host;
        if (!(ssl && port === 443 || port === 80)) {
          headers.Host += ":" + url.port;
        }
        if (settings.user) {
          if (typeof settings.password === "undefined") {
            settings.password = "";
          }
          var authBuf = new Buffer(settings.user + ":" + settings.password);
          headers.Authorization = "Basic " + authBuf.toString("base64");
        }
        if (settings.method === "GET" || settings.method === "HEAD") {
          data = null;
        } else if (data) {
          headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "text/plain;charset=UTF-8";
          }
        } else if (settings.method === "POST") {
          headers["Content-Length"] = 0;
        }
        var options2 = {
          host,
          port,
          path: uri,
          method: settings.method,
          headers,
          agent: false,
          withCredentials: self2.withCredentials
        };
        errorFlag = false;
        if (settings.async) {
          var doRequest = ssl ? https2.request : http2.request;
          sendFlag = true;
          self2.dispatchEvent("readystatechange");
          var responseHandler = function responseHandler2(resp2) {
            response = resp2;
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
              settings.url = response.headers.location;
              var url2 = Url.parse(settings.url);
              host = url2.hostname;
              var newOptions = {
                hostname: url2.hostname,
                port: url2.port,
                path: url2.path,
                method: response.statusCode === 303 ? "GET" : settings.method,
                headers,
                withCredentials: self2.withCredentials
              };
              request = doRequest(newOptions, responseHandler2).on("error", errorHandler);
              request.end();
              return;
            }
            response.setEncoding("utf8");
            setState(self2.HEADERS_RECEIVED);
            self2.status = response.statusCode;
            response.on("data", function(chunk) {
              if (chunk) {
                self2.responseText += chunk;
              }
              if (sendFlag) {
                setState(self2.LOADING);
              }
            });
            response.on("end", function() {
              if (sendFlag) {
                setState(self2.DONE);
                sendFlag = false;
              }
            });
            response.on("error", function(error3) {
              self2.handleError(error3);
            });
          };
          var errorHandler = function errorHandler2(error3) {
            self2.handleError(error3);
          };
          request = doRequest(options2, responseHandler).on("error", errorHandler);
          if (data) {
            request.write(data);
          }
          request.end();
          self2.dispatchEvent("loadstart");
        } else {
          var contentFile = ".node-xmlhttprequest-content-" + process.pid;
          var syncFile = ".node-xmlhttprequest-sync-" + process.pid;
          fs.writeFileSync(syncFile, "", "utf8");
          var execString = "var http = require('http'), https = require('https'), fs = require('fs');var doRequest = http" + (ssl ? "s" : "") + ".request;var options = " + JSON.stringify(options2) + ";var responseText = '';var req = doRequest(options, function(response) {response.setEncoding('utf8');response.on('data', function(chunk) {  responseText += chunk;});response.on('end', function() {fs.writeFileSync('" + contentFile + "', JSON.stringify({err: null, data: {statusCode: response.statusCode, headers: response.headers, text: responseText}}), 'utf8');fs.unlinkSync('" + syncFile + "');});response.on('error', function(error) {fs.writeFileSync('" + contentFile + "', JSON.stringify({err: error}), 'utf8');fs.unlinkSync('" + syncFile + "');});}).on('error', function(error) {fs.writeFileSync('" + contentFile + "', JSON.stringify({err: error}), 'utf8');fs.unlinkSync('" + syncFile + "');});" + (data ? "req.write('" + JSON.stringify(data).slice(1, -1).replace(/'/g, "\\'") + "');" : "") + "req.end();";
          var syncProc = spawn(process.argv[0], ["-e", execString]);
          while (fs.existsSync(syncFile)) {
          }
          var resp = JSON.parse(fs.readFileSync(contentFile, "utf8"));
          syncProc.stdin.end();
          fs.unlinkSync(contentFile);
          if (resp.err) {
            self2.handleError(resp.err);
          } else {
            response = resp.data;
            self2.status = resp.data.statusCode;
            self2.responseText = resp.data.text;
            setState(self2.DONE);
          }
        }
      };
      this.handleError = function(error3) {
        this.status = 0;
        this.statusText = error3;
        this.responseText = error3.stack;
        errorFlag = true;
        setState(this.DONE);
        this.dispatchEvent("error");
      };
      this.abort = function() {
        if (request) {
          request.abort();
          request = null;
        }
        headers = defaultHeaders;
        this.status = 0;
        this.responseText = "";
        this.responseXML = "";
        errorFlag = true;
        if (this.readyState !== this.UNSENT && (this.readyState !== this.OPENED || sendFlag) && this.readyState !== this.DONE) {
          sendFlag = false;
          setState(this.DONE);
        }
        this.readyState = this.UNSENT;
        this.dispatchEvent("abort");
      };
      this.addEventListener = function(event, callback) {
        if (!(event in listeners)) {
          listeners[event] = [];
        }
        listeners[event].push(callback);
      };
      this.removeEventListener = function(event, callback) {
        if (event in listeners) {
          listeners[event] = listeners[event].filter(function(ev) {
            return ev !== callback;
          });
        }
      };
      this.dispatchEvent = function(event) {
        if (typeof self2["on" + event] === "function") {
          self2["on" + event]();
        }
        if (event in listeners) {
          for (var i = 0, len = listeners[event].length; i < len; i++) {
            listeners[event][i].call(self2);
          }
        }
      };
      var setState = function(state) {
        if (state == self2.LOADING || self2.readyState !== state) {
          self2.readyState = state;
          if (settings.async || self2.readyState < self2.OPENED || self2.readyState === self2.DONE) {
            self2.dispatchEvent("readystatechange");
          }
          if (self2.readyState === self2.DONE && !errorFlag) {
            self2.dispatchEvent("load");
            self2.dispatchEvent("loadend");
          }
        }
      };
    };
  }
});

// node_modules/@firebase/app/dist/index.node.cjs.js
var require_index_node_cjs2 = __commonJS({
  "node_modules/@firebase/app/dist/index.node.cjs.js"(exports) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib = require_tslib();
    var util = require_index_node_cjs();
    var component = require_index_cjs();
    var logger$1 = require_index_cjs2();
    var Storage = require_lib();
    var xmlhttprequest = require_XMLHttpRequest();
    function _interopDefaultLegacy(e) {
      return e && typeof e === "object" && "default" in e ? e : { "default": e };
    }
    var Storage__default = /* @__PURE__ */ _interopDefaultLegacy(Storage);
    var _a$1;
    var ERRORS = (_a$1 = {}, _a$1["no-app"] = "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()", _a$1["bad-app-name"] = "Illegal App name: '{$appName}", _a$1["duplicate-app"] = "Firebase App named '{$appName}' already exists", _a$1["app-deleted"] = "Firebase App named '{$appName}' already deleted", _a$1["invalid-app-argument"] = "firebase.{$appName}() takes either no argument or a Firebase App instance.", _a$1["invalid-log-argument"] = "First argument to `onLog` must be null or a function.", _a$1);
    var ERROR_FACTORY = new util.ErrorFactory("app", "Firebase", ERRORS);
    var name$c = "@firebase/app";
    var version$1 = "0.6.29";
    var name$b = "@firebase/analytics";
    var name$a = "@firebase/app-check";
    var name$9 = "@firebase/auth";
    var name$8 = "@firebase/database";
    var name$7 = "@firebase/functions";
    var name$6 = "@firebase/installations";
    var name$5 = "@firebase/messaging";
    var name$4 = "@firebase/performance";
    var name$3 = "@firebase/remote-config";
    var name$2 = "@firebase/storage";
    var name$1 = "@firebase/firestore";
    var name = "firebase-wrapper";
    var _a;
    var DEFAULT_ENTRY_NAME = "[DEFAULT]";
    var PLATFORM_LOG_STRING = (_a = {}, _a[name$c] = "fire-core", _a[name$b] = "fire-analytics", _a[name$a] = "fire-app-check", _a[name$9] = "fire-auth", _a[name$8] = "fire-rtdb", _a[name$7] = "fire-fn", _a[name$6] = "fire-iid", _a[name$5] = "fire-fcm", _a[name$4] = "fire-perf", _a[name$3] = "fire-rc", _a[name$2] = "fire-gcs", _a[name$1] = "fire-fst", _a["fire-js"] = "fire-js", _a[name] = "fire-js-all", _a);
    var logger = new logger$1.Logger("@firebase/app");
    var FirebaseAppImpl = function() {
      function FirebaseAppImpl2(options2, config, firebase_) {
        var _this = this;
        this.firebase_ = firebase_;
        this.isDeleted_ = false;
        this.name_ = config.name;
        this.automaticDataCollectionEnabled_ = config.automaticDataCollectionEnabled || false;
        this.options_ = util.deepCopy(options2);
        this.container = new component.ComponentContainer(config.name);
        this._addComponent(new component.Component("app", function() {
          return _this;
        }, "PUBLIC"));
        this.firebase_.INTERNAL.components.forEach(function(component2) {
          return _this._addComponent(component2);
        });
      }
      Object.defineProperty(FirebaseAppImpl2.prototype, "automaticDataCollectionEnabled", {
        get: function() {
          this.checkDestroyed_();
          return this.automaticDataCollectionEnabled_;
        },
        set: function(val) {
          this.checkDestroyed_();
          this.automaticDataCollectionEnabled_ = val;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(FirebaseAppImpl2.prototype, "name", {
        get: function() {
          this.checkDestroyed_();
          return this.name_;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(FirebaseAppImpl2.prototype, "options", {
        get: function() {
          this.checkDestroyed_();
          return this.options_;
        },
        enumerable: false,
        configurable: true
      });
      FirebaseAppImpl2.prototype.delete = function() {
        var _this = this;
        return new Promise(function(resolve2) {
          _this.checkDestroyed_();
          resolve2();
        }).then(function() {
          _this.firebase_.INTERNAL.removeApp(_this.name_);
          return Promise.all(_this.container.getProviders().map(function(provider) {
            return provider.delete();
          }));
        }).then(function() {
          _this.isDeleted_ = true;
        });
      };
      FirebaseAppImpl2.prototype._getService = function(name2, instanceIdentifier) {
        var _a2;
        if (instanceIdentifier === void 0) {
          instanceIdentifier = DEFAULT_ENTRY_NAME;
        }
        this.checkDestroyed_();
        var provider = this.container.getProvider(name2);
        if (!provider.isInitialized() && ((_a2 = provider.getComponent()) === null || _a2 === void 0 ? void 0 : _a2.instantiationMode) === "EXPLICIT") {
          provider.initialize();
        }
        return provider.getImmediate({
          identifier: instanceIdentifier
        });
      };
      FirebaseAppImpl2.prototype._removeServiceInstance = function(name2, instanceIdentifier) {
        if (instanceIdentifier === void 0) {
          instanceIdentifier = DEFAULT_ENTRY_NAME;
        }
        this.container.getProvider(name2).clearInstance(instanceIdentifier);
      };
      FirebaseAppImpl2.prototype._addComponent = function(component2) {
        try {
          this.container.addComponent(component2);
        } catch (e) {
          logger.debug("Component " + component2.name + " failed to register with FirebaseApp " + this.name, e);
        }
      };
      FirebaseAppImpl2.prototype._addOrOverwriteComponent = function(component2) {
        this.container.addOrOverwriteComponent(component2);
      };
      FirebaseAppImpl2.prototype.toJSON = function() {
        return {
          name: this.name,
          automaticDataCollectionEnabled: this.automaticDataCollectionEnabled,
          options: this.options
        };
      };
      FirebaseAppImpl2.prototype.checkDestroyed_ = function() {
        if (this.isDeleted_) {
          throw ERROR_FACTORY.create("app-deleted", { appName: this.name_ });
        }
      };
      return FirebaseAppImpl2;
    }();
    FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options || FirebaseAppImpl.prototype.delete || console.log("dc");
    var version = "8.8.1";
    function createFirebaseNamespaceCore(firebaseAppImpl) {
      var apps = {};
      var components = new Map();
      var namespace = {
        __esModule: true,
        initializeApp,
        app,
        registerVersion,
        setLogLevel: logger$1.setLogLevel,
        onLog,
        apps: null,
        SDK_VERSION: version,
        INTERNAL: {
          registerComponent,
          removeApp,
          components,
          useAsService
        }
      };
      namespace["default"] = namespace;
      Object.defineProperty(namespace, "apps", {
        get: getApps
      });
      function removeApp(name2) {
        delete apps[name2];
      }
      function app(name2) {
        name2 = name2 || DEFAULT_ENTRY_NAME;
        if (!util.contains(apps, name2)) {
          throw ERROR_FACTORY.create("no-app", { appName: name2 });
        }
        return apps[name2];
      }
      app["App"] = firebaseAppImpl;
      function initializeApp(options2, rawConfig) {
        if (rawConfig === void 0) {
          rawConfig = {};
        }
        if (typeof rawConfig !== "object" || rawConfig === null) {
          var name_1 = rawConfig;
          rawConfig = { name: name_1 };
        }
        var config = rawConfig;
        if (config.name === void 0) {
          config.name = DEFAULT_ENTRY_NAME;
        }
        var name2 = config.name;
        if (typeof name2 !== "string" || !name2) {
          throw ERROR_FACTORY.create("bad-app-name", {
            appName: String(name2)
          });
        }
        if (util.contains(apps, name2)) {
          throw ERROR_FACTORY.create("duplicate-app", { appName: name2 });
        }
        var app2 = new firebaseAppImpl(options2, config, namespace);
        apps[name2] = app2;
        return app2;
      }
      function getApps() {
        return Object.keys(apps).map(function(name2) {
          return apps[name2];
        });
      }
      function registerComponent(component2) {
        var componentName = component2.name;
        if (components.has(componentName)) {
          logger.debug("There were multiple attempts to register component " + componentName + ".");
          return component2.type === "PUBLIC" ? namespace[componentName] : null;
        }
        components.set(componentName, component2);
        if (component2.type === "PUBLIC") {
          var serviceNamespace = function(appArg) {
            if (appArg === void 0) {
              appArg = app();
            }
            if (typeof appArg[componentName] !== "function") {
              throw ERROR_FACTORY.create("invalid-app-argument", {
                appName: componentName
              });
            }
            return appArg[componentName]();
          };
          if (component2.serviceProps !== void 0) {
            util.deepExtend(serviceNamespace, component2.serviceProps);
          }
          namespace[componentName] = serviceNamespace;
          firebaseAppImpl.prototype[componentName] = function() {
            var args = [];
            for (var _i2 = 0; _i2 < arguments.length; _i2++) {
              args[_i2] = arguments[_i2];
            }
            var serviceFxn = this._getService.bind(this, componentName);
            return serviceFxn.apply(this, component2.multipleInstances ? args : []);
          };
        }
        for (var _i = 0, _a2 = Object.keys(apps); _i < _a2.length; _i++) {
          var appName = _a2[_i];
          apps[appName]._addComponent(component2);
        }
        return component2.type === "PUBLIC" ? namespace[componentName] : null;
      }
      function registerVersion(libraryKeyOrName, version2, variant) {
        var _a2;
        var library = (_a2 = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a2 !== void 0 ? _a2 : libraryKeyOrName;
        if (variant) {
          library += "-" + variant;
        }
        var libraryMismatch = library.match(/\s|\//);
        var versionMismatch = version2.match(/\s|\//);
        if (libraryMismatch || versionMismatch) {
          var warning = [
            'Unable to register library "' + library + '" with version "' + version2 + '":'
          ];
          if (libraryMismatch) {
            warning.push('library name "' + library + '" contains illegal characters (whitespace or "/")');
          }
          if (libraryMismatch && versionMismatch) {
            warning.push("and");
          }
          if (versionMismatch) {
            warning.push('version name "' + version2 + '" contains illegal characters (whitespace or "/")');
          }
          logger.warn(warning.join(" "));
          return;
        }
        registerComponent(new component.Component(library + "-version", function() {
          return { library, version: version2 };
        }, "VERSION"));
      }
      function onLog(logCallback, options2) {
        if (logCallback !== null && typeof logCallback !== "function") {
          throw ERROR_FACTORY.create("invalid-log-argument");
        }
        logger$1.setUserLogHandler(logCallback, options2);
      }
      function useAsService(app2, name2) {
        if (name2 === "serverAuth") {
          return null;
        }
        var useService = name2;
        return useService;
      }
      return namespace;
    }
    function createFirebaseNamespace() {
      var namespace = createFirebaseNamespaceCore(FirebaseAppImpl);
      namespace.INTERNAL = tslib.__assign(tslib.__assign({}, namespace.INTERNAL), {
        createFirebaseNamespace,
        extendNamespace,
        createSubscribe: util.createSubscribe,
        ErrorFactory: util.ErrorFactory,
        deepExtend: util.deepExtend
      });
      function extendNamespace(props) {
        util.deepExtend(namespace, props);
      }
      return namespace;
    }
    var firebase$1 = createFirebaseNamespace();
    var PlatformLoggerService = function() {
      function PlatformLoggerService2(container) {
        this.container = container;
      }
      PlatformLoggerService2.prototype.getPlatformInfoString = function() {
        var providers = this.container.getProviders();
        return providers.map(function(provider) {
          if (isVersionServiceProvider(provider)) {
            var service = provider.getImmediate();
            return service.library + "/" + service.version;
          } else {
            return null;
          }
        }).filter(function(logString) {
          return logString;
        }).join(" ");
      };
      return PlatformLoggerService2;
    }();
    function isVersionServiceProvider(provider) {
      var component2 = provider.getComponent();
      return (component2 === null || component2 === void 0 ? void 0 : component2.type) === "VERSION";
    }
    function registerCoreComponents(firebase3, variant) {
      firebase3.INTERNAL.registerComponent(new component.Component("platform-logger", function(container) {
        return new PlatformLoggerService(container);
      }, "PRIVATE"));
      firebase3.registerVersion(name$c, version$1, variant);
      firebase3.registerVersion("fire-js", "");
    }
    firebase$1.INTERNAL.extendNamespace({
      INTERNAL: {
        node: {
          localStorage: new Storage__default["default"](null, { strict: true }),
          sessionStorage: new Storage__default["default"](null, { strict: true }),
          XMLHttpRequest: xmlhttprequest.XMLHttpRequest
        }
      }
    });
    var firebase2 = firebase$1;
    registerCoreComponents(firebase2, "node");
    exports.default = firebase2;
    exports.firebase = firebase2;
  }
});

// node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/safe-buffer/index.js"(exports, module2) {
    init_shims();
    var buffer = require("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src2, dst) {
      for (var key in src2) {
        dst[key] = src2[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module2.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/websocket-driver/lib/websocket/streams.js
var require_streams = __commonJS({
  "node_modules/websocket-driver/lib/websocket/streams.js"(exports) {
    init_shims();
    "use strict";
    var Stream2 = require("stream").Stream;
    var util = require("util");
    var IO = function(driver) {
      this.readable = this.writable = true;
      this._paused = false;
      this._driver = driver;
    };
    util.inherits(IO, Stream2);
    IO.prototype.pause = function() {
      this._paused = true;
      this._driver.messages._paused = true;
    };
    IO.prototype.resume = function() {
      this._paused = false;
      this.emit("drain");
      var messages = this._driver.messages;
      messages._paused = false;
      messages.emit("drain");
    };
    IO.prototype.write = function(chunk) {
      if (!this.writable)
        return false;
      this._driver.parse(chunk);
      return !this._paused;
    };
    IO.prototype.end = function(chunk) {
      if (!this.writable)
        return;
      if (chunk !== void 0)
        this.write(chunk);
      this.writable = false;
      var messages = this._driver.messages;
      if (messages.readable) {
        messages.readable = messages.writable = false;
        messages.emit("end");
      }
    };
    IO.prototype.destroy = function() {
      this.end();
    };
    var Messages = function(driver) {
      this.readable = this.writable = true;
      this._paused = false;
      this._driver = driver;
    };
    util.inherits(Messages, Stream2);
    Messages.prototype.pause = function() {
      this._driver.io._paused = true;
    };
    Messages.prototype.resume = function() {
      this._driver.io._paused = false;
      this._driver.io.emit("drain");
    };
    Messages.prototype.write = function(message) {
      if (!this.writable)
        return false;
      if (typeof message === "string")
        this._driver.text(message);
      else
        this._driver.binary(message);
      return !this._paused;
    };
    Messages.prototype.end = function(message) {
      if (message !== void 0)
        this.write(message);
    };
    Messages.prototype.destroy = function() {
    };
    exports.IO = IO;
    exports.Messages = Messages;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/headers.js
var require_headers = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/headers.js"(exports, module2) {
    init_shims();
    "use strict";
    var Headers2 = function() {
      this.clear();
    };
    Headers2.prototype.ALLOWED_DUPLICATES = ["set-cookie", "set-cookie2", "warning", "www-authenticate"];
    Headers2.prototype.clear = function() {
      this._sent = {};
      this._lines = [];
    };
    Headers2.prototype.set = function(name, value) {
      if (value === void 0)
        return;
      name = this._strip(name);
      value = this._strip(value);
      var key = name.toLowerCase();
      if (!this._sent.hasOwnProperty(key) || this.ALLOWED_DUPLICATES.indexOf(key) >= 0) {
        this._sent[key] = true;
        this._lines.push(name + ": " + value + "\r\n");
      }
    };
    Headers2.prototype.toString = function() {
      return this._lines.join("");
    };
    Headers2.prototype._strip = function(string) {
      return string.toString().replace(/^ */, "").replace(/ *$/, "");
    };
    module2.exports = Headers2;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/stream_reader.js
var require_stream_reader = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/stream_reader.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var StreamReader = function() {
      this._queue = [];
      this._queueSize = 0;
      this._offset = 0;
    };
    StreamReader.prototype.put = function(buffer) {
      if (!buffer || buffer.length === 0)
        return;
      if (!Buffer2.isBuffer(buffer))
        buffer = Buffer2.from(buffer);
      this._queue.push(buffer);
      this._queueSize += buffer.length;
    };
    StreamReader.prototype.read = function(length) {
      if (length > this._queueSize)
        return null;
      if (length === 0)
        return Buffer2.alloc(0);
      this._queueSize -= length;
      var queue = this._queue, remain = length, first = queue[0], buffers, buffer;
      if (first.length >= length) {
        if (first.length === length) {
          return queue.shift();
        } else {
          buffer = first.slice(0, length);
          queue[0] = first.slice(length);
          return buffer;
        }
      }
      for (var i = 0, n = queue.length; i < n; i++) {
        if (remain < queue[i].length)
          break;
        remain -= queue[i].length;
      }
      buffers = queue.splice(0, i);
      if (remain > 0 && queue.length > 0) {
        buffers.push(queue[0].slice(0, remain));
        queue[0] = queue[0].slice(remain);
      }
      return Buffer2.concat(buffers, length);
    };
    StreamReader.prototype.eachByte = function(callback, context) {
      var buffer, n, index2;
      while (this._queue.length > 0) {
        buffer = this._queue[0];
        n = buffer.length;
        while (this._offset < n) {
          index2 = this._offset;
          this._offset += 1;
          callback.call(context, buffer[index2]);
        }
        this._offset = 0;
        this._queue.shift();
      }
    };
    module2.exports = StreamReader;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/base.js
var require_base = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/base.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var Emitter = require("events").EventEmitter;
    var util = require("util");
    var streams = require_streams();
    var Headers2 = require_headers();
    var Reader = require_stream_reader();
    var Base = function(request, url, options2) {
      Emitter.call(this);
      Base.validateOptions(options2 || {}, ["maxLength", "masking", "requireMasking", "protocols"]);
      this._request = request;
      this._reader = new Reader();
      this._options = options2 || {};
      this._maxLength = this._options.maxLength || this.MAX_LENGTH;
      this._headers = new Headers2();
      this.__queue = [];
      this.readyState = 0;
      this.url = url;
      this.io = new streams.IO(this);
      this.messages = new streams.Messages(this);
      this._bindEventListeners();
    };
    util.inherits(Base, Emitter);
    Base.isWebSocket = function(request) {
      var connection = request.headers.connection || "", upgrade = request.headers.upgrade || "";
      return request.method === "GET" && connection.toLowerCase().split(/ *, */).indexOf("upgrade") >= 0 && upgrade.toLowerCase() === "websocket";
    };
    Base.validateOptions = function(options2, validKeys) {
      for (var key2 in options2) {
        if (validKeys.indexOf(key2) < 0)
          throw new Error("Unrecognized option: " + key2);
      }
    };
    var instance = {
      MAX_LENGTH: 67108863,
      STATES: ["connecting", "open", "closing", "closed"],
      _bindEventListeners: function() {
        var self2 = this;
        this.messages.on("error", function() {
        });
        this.on("message", function(event) {
          var messages = self2.messages;
          if (messages.readable)
            messages.emit("data", event.data);
        });
        this.on("error", function(error3) {
          var messages = self2.messages;
          if (messages.readable)
            messages.emit("error", error3);
        });
        this.on("close", function() {
          var messages = self2.messages;
          if (!messages.readable)
            return;
          messages.readable = messages.writable = false;
          messages.emit("end");
        });
      },
      getState: function() {
        return this.STATES[this.readyState] || null;
      },
      addExtension: function(extension) {
        return false;
      },
      setHeader: function(name, value) {
        if (this.readyState > 0)
          return false;
        this._headers.set(name, value);
        return true;
      },
      start: function() {
        if (this.readyState !== 0)
          return false;
        if (!Base.isWebSocket(this._request))
          return this._failHandshake(new Error("Not a WebSocket request"));
        var response;
        try {
          response = this._handshakeResponse();
        } catch (error3) {
          return this._failHandshake(error3);
        }
        this._write(response);
        if (this._stage !== -1)
          this._open();
        return true;
      },
      _failHandshake: function(error3) {
        var headers = new Headers2();
        headers.set("Content-Type", "text/plain");
        headers.set("Content-Length", Buffer2.byteLength(error3.message, "utf8"));
        headers = ["HTTP/1.1 400 Bad Request", headers.toString(), error3.message];
        this._write(Buffer2.from(headers.join("\r\n"), "utf8"));
        this._fail("protocol_error", error3.message);
        return false;
      },
      text: function(message) {
        return this.frame(message);
      },
      binary: function(message) {
        return false;
      },
      ping: function() {
        return false;
      },
      pong: function() {
        return false;
      },
      close: function(reason, code) {
        if (this.readyState !== 1)
          return false;
        this.readyState = 3;
        this.emit("close", new Base.CloseEvent(null, null));
        return true;
      },
      _open: function() {
        this.readyState = 1;
        this.__queue.forEach(function(args) {
          this.frame.apply(this, args);
        }, this);
        this.__queue = [];
        this.emit("open", new Base.OpenEvent());
      },
      _queue: function(message) {
        this.__queue.push(message);
        return true;
      },
      _write: function(chunk) {
        var io = this.io;
        if (io.readable)
          io.emit("data", chunk);
      },
      _fail: function(type, message) {
        this.readyState = 2;
        this.emit("error", new Error(message));
        this.close();
      }
    };
    for (key in instance)
      Base.prototype[key] = instance[key];
    var key;
    Base.ConnectEvent = function() {
    };
    Base.OpenEvent = function() {
    };
    Base.CloseEvent = function(code, reason) {
      this.code = code;
      this.reason = reason;
    };
    Base.MessageEvent = function(data) {
      this.data = data;
    };
    Base.PingEvent = function(data) {
      this.data = data;
    };
    Base.PongEvent = function(data) {
      this.data = data;
    };
    module2.exports = Base;
  }
});

// node_modules/http-parser-js/http-parser.js
var require_http_parser = __commonJS({
  "node_modules/http-parser-js/http-parser.js"(exports) {
    init_shims();
    var assert = require("assert");
    exports.HTTPParser = HTTPParser;
    function HTTPParser(type) {
      assert.ok(type === HTTPParser.REQUEST || type === HTTPParser.RESPONSE || type === void 0);
      if (type === void 0) {
      } else {
        this.initialize(type);
      }
    }
    HTTPParser.prototype.initialize = function(type, async_resource) {
      assert.ok(type === HTTPParser.REQUEST || type === HTTPParser.RESPONSE);
      this.type = type;
      this.state = type + "_LINE";
      this.info = {
        headers: [],
        upgrade: false
      };
      this.trailers = [];
      this.line = "";
      this.isChunked = false;
      this.connection = "";
      this.headerSize = 0;
      this.body_bytes = null;
      this.isUserCall = false;
      this.hadError = false;
    };
    HTTPParser.encoding = "ascii";
    HTTPParser.maxHeaderSize = 80 * 1024;
    HTTPParser.REQUEST = "REQUEST";
    HTTPParser.RESPONSE = "RESPONSE";
    var kOnHeaders = HTTPParser.kOnHeaders = 1;
    var kOnHeadersComplete = HTTPParser.kOnHeadersComplete = 2;
    var kOnBody = HTTPParser.kOnBody = 3;
    var kOnMessageComplete = HTTPParser.kOnMessageComplete = 4;
    HTTPParser.prototype[kOnHeaders] = HTTPParser.prototype[kOnHeadersComplete] = HTTPParser.prototype[kOnBody] = HTTPParser.prototype[kOnMessageComplete] = function() {
    };
    var compatMode0_12 = true;
    Object.defineProperty(HTTPParser, "kOnExecute", {
      get: function() {
        compatMode0_12 = false;
        return 99;
      }
    });
    var methods = exports.methods = HTTPParser.methods = [
      "DELETE",
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "CONNECT",
      "OPTIONS",
      "TRACE",
      "COPY",
      "LOCK",
      "MKCOL",
      "MOVE",
      "PROPFIND",
      "PROPPATCH",
      "SEARCH",
      "UNLOCK",
      "BIND",
      "REBIND",
      "UNBIND",
      "ACL",
      "REPORT",
      "MKACTIVITY",
      "CHECKOUT",
      "MERGE",
      "M-SEARCH",
      "NOTIFY",
      "SUBSCRIBE",
      "UNSUBSCRIBE",
      "PATCH",
      "PURGE",
      "MKCALENDAR",
      "LINK",
      "UNLINK"
    ];
    var method_connect = methods.indexOf("CONNECT");
    HTTPParser.prototype.reinitialize = HTTPParser;
    HTTPParser.prototype.close = HTTPParser.prototype.pause = HTTPParser.prototype.resume = HTTPParser.prototype.free = function() {
    };
    HTTPParser.prototype._compatMode0_11 = false;
    HTTPParser.prototype.getAsyncId = function() {
      return 0;
    };
    var headerState = {
      REQUEST_LINE: true,
      RESPONSE_LINE: true,
      HEADER: true
    };
    HTTPParser.prototype.execute = function(chunk, start, length) {
      if (!(this instanceof HTTPParser)) {
        throw new TypeError("not a HTTPParser");
      }
      start = start || 0;
      length = typeof length === "number" ? length : chunk.length;
      this.chunk = chunk;
      this.offset = start;
      var end = this.end = start + length;
      try {
        while (this.offset < end) {
          if (this[this.state]()) {
            break;
          }
        }
      } catch (err) {
        if (this.isUserCall) {
          throw err;
        }
        this.hadError = true;
        return err;
      }
      this.chunk = null;
      length = this.offset - start;
      if (headerState[this.state]) {
        this.headerSize += length;
        if (this.headerSize > HTTPParser.maxHeaderSize) {
          return new Error("max header size exceeded");
        }
      }
      return length;
    };
    var stateFinishAllowed = {
      REQUEST_LINE: true,
      RESPONSE_LINE: true,
      BODY_RAW: true
    };
    HTTPParser.prototype.finish = function() {
      if (this.hadError) {
        return;
      }
      if (!stateFinishAllowed[this.state]) {
        return new Error("invalid state for EOF");
      }
      if (this.state === "BODY_RAW") {
        this.userCall()(this[kOnMessageComplete]());
      }
    };
    HTTPParser.prototype.consume = HTTPParser.prototype.unconsume = HTTPParser.prototype.getCurrentBuffer = function() {
    };
    HTTPParser.prototype.userCall = function() {
      this.isUserCall = true;
      var self2 = this;
      return function(ret) {
        self2.isUserCall = false;
        return ret;
      };
    };
    HTTPParser.prototype.nextRequest = function() {
      this.userCall()(this[kOnMessageComplete]());
      this.reinitialize(this.type);
    };
    HTTPParser.prototype.consumeLine = function() {
      var end = this.end, chunk = this.chunk;
      for (var i = this.offset; i < end; i++) {
        if (chunk[i] === 10) {
          var line = this.line + chunk.toString(HTTPParser.encoding, this.offset, i);
          if (line.charAt(line.length - 1) === "\r") {
            line = line.substr(0, line.length - 1);
          }
          this.line = "";
          this.offset = i + 1;
          return line;
        }
      }
      this.line += chunk.toString(HTTPParser.encoding, this.offset, this.end);
      this.offset = this.end;
    };
    var headerExp = /^([^: \t]+):[ \t]*((?:.*[^ \t])|)/;
    var headerContinueExp = /^[ \t]+(.*[^ \t])/;
    HTTPParser.prototype.parseHeader = function(line, headers) {
      if (line.indexOf("\r") !== -1) {
        throw parseErrorCode("HPE_LF_EXPECTED");
      }
      var match = headerExp.exec(line);
      var k = match && match[1];
      if (k) {
        headers.push(k);
        headers.push(match[2]);
      } else {
        var matchContinue = headerContinueExp.exec(line);
        if (matchContinue && headers.length) {
          if (headers[headers.length - 1]) {
            headers[headers.length - 1] += " ";
          }
          headers[headers.length - 1] += matchContinue[1];
        }
      }
    };
    var requestExp = /^([A-Z-]+) ([^ ]+) HTTP\/(\d)\.(\d)$/;
    HTTPParser.prototype.REQUEST_LINE = function() {
      var line = this.consumeLine();
      if (!line) {
        return;
      }
      var match = requestExp.exec(line);
      if (match === null) {
        throw parseErrorCode("HPE_INVALID_CONSTANT");
      }
      this.info.method = this._compatMode0_11 ? match[1] : methods.indexOf(match[1]);
      if (this.info.method === -1) {
        throw new Error("invalid request method");
      }
      this.info.url = match[2];
      this.info.versionMajor = +match[3];
      this.info.versionMinor = +match[4];
      this.body_bytes = 0;
      this.state = "HEADER";
    };
    var responseExp = /^HTTP\/(\d)\.(\d) (\d{3}) ?(.*)$/;
    HTTPParser.prototype.RESPONSE_LINE = function() {
      var line = this.consumeLine();
      if (!line) {
        return;
      }
      var match = responseExp.exec(line);
      if (match === null) {
        throw parseErrorCode("HPE_INVALID_CONSTANT");
      }
      this.info.versionMajor = +match[1];
      this.info.versionMinor = +match[2];
      var statusCode = this.info.statusCode = +match[3];
      this.info.statusMessage = match[4];
      if ((statusCode / 100 | 0) === 1 || statusCode === 204 || statusCode === 304) {
        this.body_bytes = 0;
      }
      this.state = "HEADER";
    };
    HTTPParser.prototype.shouldKeepAlive = function() {
      if (this.info.versionMajor > 0 && this.info.versionMinor > 0) {
        if (this.connection.indexOf("close") !== -1) {
          return false;
        }
      } else if (this.connection.indexOf("keep-alive") === -1) {
        return false;
      }
      if (this.body_bytes !== null || this.isChunked) {
        return true;
      }
      return false;
    };
    HTTPParser.prototype.HEADER = function() {
      var line = this.consumeLine();
      if (line === void 0) {
        return;
      }
      var info = this.info;
      if (line) {
        this.parseHeader(line, info.headers);
      } else {
        var headers = info.headers;
        var hasContentLength = false;
        var currentContentLengthValue;
        var hasUpgradeHeader = false;
        for (var i = 0; i < headers.length; i += 2) {
          switch (headers[i].toLowerCase()) {
            case "transfer-encoding":
              this.isChunked = headers[i + 1].toLowerCase() === "chunked";
              break;
            case "content-length":
              currentContentLengthValue = +headers[i + 1];
              if (hasContentLength) {
                if (currentContentLengthValue !== this.body_bytes) {
                  throw parseErrorCode("HPE_UNEXPECTED_CONTENT_LENGTH");
                }
              } else {
                hasContentLength = true;
                this.body_bytes = currentContentLengthValue;
              }
              break;
            case "connection":
              this.connection += headers[i + 1].toLowerCase();
              break;
            case "upgrade":
              hasUpgradeHeader = true;
              break;
          }
        }
        if (this.isChunked && hasContentLength) {
          hasContentLength = false;
          this.body_bytes = null;
        }
        if (hasUpgradeHeader && this.connection.indexOf("upgrade") != -1) {
          info.upgrade = this.type === HTTPParser.REQUEST || info.statusCode === 101;
        } else {
          info.upgrade = info.method === method_connect;
        }
        if (this.isChunked && info.upgrade) {
          this.isChunked = false;
        }
        info.shouldKeepAlive = this.shouldKeepAlive();
        var skipBody;
        if (compatMode0_12) {
          skipBody = this.userCall()(this[kOnHeadersComplete](info));
        } else {
          skipBody = this.userCall()(this[kOnHeadersComplete](info.versionMajor, info.versionMinor, info.headers, info.method, info.url, info.statusCode, info.statusMessage, info.upgrade, info.shouldKeepAlive));
        }
        if (skipBody === 2) {
          this.nextRequest();
          return true;
        } else if (this.isChunked && !skipBody) {
          this.state = "BODY_CHUNKHEAD";
        } else if (skipBody || this.body_bytes === 0) {
          this.nextRequest();
          return info.upgrade;
        } else if (this.body_bytes === null) {
          this.state = "BODY_RAW";
        } else {
          this.state = "BODY_SIZED";
        }
      }
    };
    HTTPParser.prototype.BODY_CHUNKHEAD = function() {
      var line = this.consumeLine();
      if (line === void 0) {
        return;
      }
      this.body_bytes = parseInt(line, 16);
      if (!this.body_bytes) {
        this.state = "BODY_CHUNKTRAILERS";
      } else {
        this.state = "BODY_CHUNK";
      }
    };
    HTTPParser.prototype.BODY_CHUNK = function() {
      var length = Math.min(this.end - this.offset, this.body_bytes);
      this.userCall()(this[kOnBody](this.chunk, this.offset, length));
      this.offset += length;
      this.body_bytes -= length;
      if (!this.body_bytes) {
        this.state = "BODY_CHUNKEMPTYLINE";
      }
    };
    HTTPParser.prototype.BODY_CHUNKEMPTYLINE = function() {
      var line = this.consumeLine();
      if (line === void 0) {
        return;
      }
      assert.equal(line, "");
      this.state = "BODY_CHUNKHEAD";
    };
    HTTPParser.prototype.BODY_CHUNKTRAILERS = function() {
      var line = this.consumeLine();
      if (line === void 0) {
        return;
      }
      if (line) {
        this.parseHeader(line, this.trailers);
      } else {
        if (this.trailers.length) {
          this.userCall()(this[kOnHeaders](this.trailers, ""));
        }
        this.nextRequest();
      }
    };
    HTTPParser.prototype.BODY_RAW = function() {
      var length = this.end - this.offset;
      this.userCall()(this[kOnBody](this.chunk, this.offset, length));
      this.offset = this.end;
    };
    HTTPParser.prototype.BODY_SIZED = function() {
      var length = Math.min(this.end - this.offset, this.body_bytes);
      this.userCall()(this[kOnBody](this.chunk, this.offset, length));
      this.offset += length;
      this.body_bytes -= length;
      if (!this.body_bytes) {
        this.nextRequest();
      }
    };
    ["Headers", "HeadersComplete", "Body", "MessageComplete"].forEach(function(name) {
      var k = HTTPParser["kOn" + name];
      Object.defineProperty(HTTPParser.prototype, "on" + name, {
        get: function() {
          return this[k];
        },
        set: function(to) {
          this._compatMode0_11 = true;
          method_connect = "CONNECT";
          return this[k] = to;
        }
      });
    });
    function parseErrorCode(code) {
      var err = new Error("Parse Error");
      err.code = code;
      return err;
    }
  }
});

// node_modules/websocket-driver/lib/websocket/http_parser.js
var require_http_parser2 = __commonJS({
  "node_modules/websocket-driver/lib/websocket/http_parser.js"(exports, module2) {
    init_shims();
    "use strict";
    var NodeHTTPParser = require_http_parser().HTTPParser;
    var Buffer2 = require_safe_buffer().Buffer;
    var TYPES = {
      request: NodeHTTPParser.REQUEST || "request",
      response: NodeHTTPParser.RESPONSE || "response"
    };
    var HttpParser = function(type) {
      this._type = type;
      this._parser = new NodeHTTPParser(TYPES[type]);
      this._complete = false;
      this.headers = {};
      var current = null, self2 = this;
      this._parser.onHeaderField = function(b, start, length) {
        current = b.toString("utf8", start, start + length).toLowerCase();
      };
      this._parser.onHeaderValue = function(b, start, length) {
        var value = b.toString("utf8", start, start + length);
        if (self2.headers.hasOwnProperty(current))
          self2.headers[current] += ", " + value;
        else
          self2.headers[current] = value;
      };
      this._parser.onHeadersComplete = this._parser[NodeHTTPParser.kOnHeadersComplete] = function(majorVersion, minorVersion, headers, method, pathname, statusCode) {
        var info = arguments[0];
        if (typeof info === "object") {
          method = info.method;
          pathname = info.url;
          statusCode = info.statusCode;
          headers = info.headers;
        }
        self2.method = typeof method === "number" ? HttpParser.METHODS[method] : method;
        self2.statusCode = statusCode;
        self2.url = pathname;
        if (!headers)
          return;
        for (var i = 0, n = headers.length, key, value; i < n; i += 2) {
          key = headers[i].toLowerCase();
          value = headers[i + 1];
          if (self2.headers.hasOwnProperty(key))
            self2.headers[key] += ", " + value;
          else
            self2.headers[key] = value;
        }
        self2._complete = true;
      };
    };
    HttpParser.METHODS = {
      0: "DELETE",
      1: "GET",
      2: "HEAD",
      3: "POST",
      4: "PUT",
      5: "CONNECT",
      6: "OPTIONS",
      7: "TRACE",
      8: "COPY",
      9: "LOCK",
      10: "MKCOL",
      11: "MOVE",
      12: "PROPFIND",
      13: "PROPPATCH",
      14: "SEARCH",
      15: "UNLOCK",
      16: "BIND",
      17: "REBIND",
      18: "UNBIND",
      19: "ACL",
      20: "REPORT",
      21: "MKACTIVITY",
      22: "CHECKOUT",
      23: "MERGE",
      24: "M-SEARCH",
      25: "NOTIFY",
      26: "SUBSCRIBE",
      27: "UNSUBSCRIBE",
      28: "PATCH",
      29: "PURGE",
      30: "MKCALENDAR",
      31: "LINK",
      32: "UNLINK"
    };
    var VERSION = process.version ? process.version.match(/[0-9]+/g).map(function(n) {
      return parseInt(n, 10);
    }) : [];
    if (VERSION[0] === 0 && VERSION[1] === 12) {
      HttpParser.METHODS[16] = "REPORT";
      HttpParser.METHODS[17] = "MKACTIVITY";
      HttpParser.METHODS[18] = "CHECKOUT";
      HttpParser.METHODS[19] = "MERGE";
      HttpParser.METHODS[20] = "M-SEARCH";
      HttpParser.METHODS[21] = "NOTIFY";
      HttpParser.METHODS[22] = "SUBSCRIBE";
      HttpParser.METHODS[23] = "UNSUBSCRIBE";
      HttpParser.METHODS[24] = "PATCH";
      HttpParser.METHODS[25] = "PURGE";
    }
    HttpParser.prototype.isComplete = function() {
      return this._complete;
    };
    HttpParser.prototype.parse = function(chunk) {
      var consumed = this._parser.execute(chunk, 0, chunk.length);
      if (typeof consumed !== "number") {
        this.error = consumed;
        this._complete = true;
        return;
      }
      if (this._complete)
        this.body = consumed < chunk.length ? chunk.slice(consumed) : Buffer2.alloc(0);
    };
    module2.exports = HttpParser;
  }
});

// node_modules/websocket-extensions/lib/parser.js
var require_parser = __commonJS({
  "node_modules/websocket-extensions/lib/parser.js"(exports, module2) {
    init_shims();
    "use strict";
    var TOKEN = /([!#\$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+)/;
    var NOTOKEN = /([^!#\$%&'\*\+\-\.\^_`\|~0-9A-Za-z])/g;
    var QUOTED = /"((?:\\[\x00-\x7f]|[^\x00-\x08\x0a-\x1f\x7f"\\])*)"/;
    var PARAM = new RegExp(TOKEN.source + "(?:=(?:" + TOKEN.source + "|" + QUOTED.source + "))?");
    var EXT = new RegExp(TOKEN.source + "(?: *; *" + PARAM.source + ")*", "g");
    var EXT_LIST = new RegExp("^" + EXT.source + "(?: *, *" + EXT.source + ")*$");
    var NUMBER = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var Parser = {
      parseHeader: function(header) {
        var offers = new Offers();
        if (header === "" || header === void 0)
          return offers;
        if (!EXT_LIST.test(header))
          throw new SyntaxError("Invalid Sec-WebSocket-Extensions header: " + header);
        var values = header.match(EXT);
        values.forEach(function(value) {
          var params = value.match(new RegExp(PARAM.source, "g")), name = params.shift(), offer = {};
          params.forEach(function(param) {
            var args = param.match(PARAM), key = args[1], data;
            if (args[2] !== void 0) {
              data = args[2];
            } else if (args[3] !== void 0) {
              data = args[3].replace(/\\/g, "");
            } else {
              data = true;
            }
            if (NUMBER.test(data))
              data = parseFloat(data);
            if (hasOwnProperty.call(offer, key)) {
              offer[key] = [].concat(offer[key]);
              offer[key].push(data);
            } else {
              offer[key] = data;
            }
          }, this);
          offers.push(name, offer);
        }, this);
        return offers;
      },
      serializeParams: function(name, params) {
        var values = [];
        var print = function(key2, value) {
          if (value instanceof Array) {
            value.forEach(function(v) {
              print(key2, v);
            });
          } else if (value === true) {
            values.push(key2);
          } else if (typeof value === "number") {
            values.push(key2 + "=" + value);
          } else if (NOTOKEN.test(value)) {
            values.push(key2 + '="' + value.replace(/"/g, '\\"') + '"');
          } else {
            values.push(key2 + "=" + value);
          }
        };
        for (var key in params)
          print(key, params[key]);
        return [name].concat(values).join("; ");
      }
    };
    var Offers = function() {
      this._byName = {};
      this._inOrder = [];
    };
    Offers.prototype.push = function(name, params) {
      if (!hasOwnProperty.call(this._byName, name))
        this._byName[name] = [];
      this._byName[name].push(params);
      this._inOrder.push({ name, params });
    };
    Offers.prototype.eachOffer = function(callback, context) {
      var list = this._inOrder;
      for (var i = 0, n = list.length; i < n; i++)
        callback.call(context, list[i].name, list[i].params);
    };
    Offers.prototype.byName = function(name) {
      return this._byName[name] || [];
    };
    Offers.prototype.toArray = function() {
      return this._inOrder.slice();
    };
    module2.exports = Parser;
  }
});

// node_modules/websocket-extensions/lib/pipeline/ring_buffer.js
var require_ring_buffer = __commonJS({
  "node_modules/websocket-extensions/lib/pipeline/ring_buffer.js"(exports, module2) {
    init_shims();
    "use strict";
    var RingBuffer = function(bufferSize) {
      this._bufferSize = bufferSize;
      this.clear();
    };
    RingBuffer.prototype.clear = function() {
      this._buffer = new Array(this._bufferSize);
      this._ringOffset = 0;
      this._ringSize = this._bufferSize;
      this._head = 0;
      this._tail = 0;
      this.length = 0;
    };
    RingBuffer.prototype.push = function(value) {
      var expandBuffer = false, expandRing = false;
      if (this._ringSize < this._bufferSize) {
        expandBuffer = this._tail === 0;
      } else if (this._ringOffset === this._ringSize) {
        expandBuffer = true;
        expandRing = this._tail === 0;
      }
      if (expandBuffer) {
        this._tail = this._bufferSize;
        this._buffer = this._buffer.concat(new Array(this._bufferSize));
        this._bufferSize = this._buffer.length;
        if (expandRing)
          this._ringSize = this._bufferSize;
      }
      this._buffer[this._tail] = value;
      this.length += 1;
      if (this._tail < this._ringSize)
        this._ringOffset += 1;
      this._tail = (this._tail + 1) % this._bufferSize;
    };
    RingBuffer.prototype.peek = function() {
      if (this.length === 0)
        return void 0;
      return this._buffer[this._head];
    };
    RingBuffer.prototype.shift = function() {
      if (this.length === 0)
        return void 0;
      var value = this._buffer[this._head];
      this._buffer[this._head] = void 0;
      this.length -= 1;
      this._ringOffset -= 1;
      if (this._ringOffset === 0 && this.length > 0) {
        this._head = this._ringSize;
        this._ringOffset = this.length;
        this._ringSize = this._bufferSize;
      } else {
        this._head = (this._head + 1) % this._ringSize;
      }
      return value;
    };
    module2.exports = RingBuffer;
  }
});

// node_modules/websocket-extensions/lib/pipeline/functor.js
var require_functor = __commonJS({
  "node_modules/websocket-extensions/lib/pipeline/functor.js"(exports, module2) {
    init_shims();
    "use strict";
    var RingBuffer = require_ring_buffer();
    var Functor = function(session, method) {
      this._session = session;
      this._method = method;
      this._queue = new RingBuffer(Functor.QUEUE_SIZE);
      this._stopped = false;
      this.pending = 0;
    };
    Functor.QUEUE_SIZE = 8;
    Functor.prototype.call = function(error3, message, callback, context) {
      if (this._stopped)
        return;
      var record = { error: error3, message, callback, context, done: false }, called = false, self2 = this;
      this._queue.push(record);
      if (record.error) {
        record.done = true;
        this._stop();
        return this._flushQueue();
      }
      var handler = function(err, msg) {
        if (!(called ^ (called = true)))
          return;
        if (err) {
          self2._stop();
          record.error = err;
          record.message = null;
        } else {
          record.message = msg;
        }
        record.done = true;
        self2._flushQueue();
      };
      try {
        this._session[this._method](message, handler);
      } catch (err) {
        handler(err);
      }
    };
    Functor.prototype._stop = function() {
      this.pending = this._queue.length;
      this._stopped = true;
    };
    Functor.prototype._flushQueue = function() {
      var queue = this._queue, record;
      while (queue.length > 0 && queue.peek().done) {
        record = queue.shift();
        if (record.error) {
          this.pending = 0;
          queue.clear();
        } else {
          this.pending -= 1;
        }
        record.callback.call(record.context, record.error, record.message);
      }
    };
    module2.exports = Functor;
  }
});

// node_modules/websocket-extensions/lib/pipeline/pledge.js
var require_pledge = __commonJS({
  "node_modules/websocket-extensions/lib/pipeline/pledge.js"(exports, module2) {
    init_shims();
    "use strict";
    var RingBuffer = require_ring_buffer();
    var Pledge = function() {
      this._complete = false;
      this._callbacks = new RingBuffer(Pledge.QUEUE_SIZE);
    };
    Pledge.QUEUE_SIZE = 4;
    Pledge.all = function(list) {
      var pledge = new Pledge(), pending = list.length, n = pending;
      if (pending === 0)
        pledge.done();
      while (n--)
        list[n].then(function() {
          pending -= 1;
          if (pending === 0)
            pledge.done();
        });
      return pledge;
    };
    Pledge.prototype.then = function(callback) {
      if (this._complete)
        callback();
      else
        this._callbacks.push(callback);
    };
    Pledge.prototype.done = function() {
      this._complete = true;
      var callbacks = this._callbacks, callback;
      while (callback = callbacks.shift())
        callback();
    };
    module2.exports = Pledge;
  }
});

// node_modules/websocket-extensions/lib/pipeline/cell.js
var require_cell = __commonJS({
  "node_modules/websocket-extensions/lib/pipeline/cell.js"(exports, module2) {
    init_shims();
    "use strict";
    var Functor = require_functor();
    var Pledge = require_pledge();
    var Cell = function(tuple) {
      this._ext = tuple[0];
      this._session = tuple[1];
      this._functors = {
        incoming: new Functor(this._session, "processIncomingMessage"),
        outgoing: new Functor(this._session, "processOutgoingMessage")
      };
    };
    Cell.prototype.pending = function(direction) {
      var functor = this._functors[direction];
      if (!functor._stopped)
        functor.pending += 1;
    };
    Cell.prototype.incoming = function(error3, message, callback, context) {
      this._exec("incoming", error3, message, callback, context);
    };
    Cell.prototype.outgoing = function(error3, message, callback, context) {
      this._exec("outgoing", error3, message, callback, context);
    };
    Cell.prototype.close = function() {
      this._closed = this._closed || new Pledge();
      this._doClose();
      return this._closed;
    };
    Cell.prototype._exec = function(direction, error3, message, callback, context) {
      this._functors[direction].call(error3, message, function(err, msg) {
        if (err)
          err.message = this._ext.name + ": " + err.message;
        callback.call(context, err, msg);
        this._doClose();
      }, this);
    };
    Cell.prototype._doClose = function() {
      var fin = this._functors.incoming, fout = this._functors.outgoing;
      if (!this._closed || fin.pending + fout.pending !== 0)
        return;
      if (this._session)
        this._session.close();
      this._session = null;
      this._closed.done();
    };
    module2.exports = Cell;
  }
});

// node_modules/websocket-extensions/lib/pipeline/index.js
var require_pipeline = __commonJS({
  "node_modules/websocket-extensions/lib/pipeline/index.js"(exports, module2) {
    init_shims();
    "use strict";
    var Cell = require_cell();
    var Pledge = require_pledge();
    var Pipeline = function(sessions) {
      this._cells = sessions.map(function(session) {
        return new Cell(session);
      });
      this._stopped = { incoming: false, outgoing: false };
    };
    Pipeline.prototype.processIncomingMessage = function(message, callback, context) {
      if (this._stopped.incoming)
        return;
      this._loop("incoming", this._cells.length - 1, -1, -1, message, callback, context);
    };
    Pipeline.prototype.processOutgoingMessage = function(message, callback, context) {
      if (this._stopped.outgoing)
        return;
      this._loop("outgoing", 0, this._cells.length, 1, message, callback, context);
    };
    Pipeline.prototype.close = function(callback, context) {
      this._stopped = { incoming: true, outgoing: true };
      var closed = this._cells.map(function(a) {
        return a.close();
      });
      if (callback)
        Pledge.all(closed).then(function() {
          callback.call(context);
        });
    };
    Pipeline.prototype._loop = function(direction, start, end, step, message, callback, context) {
      var cells = this._cells, n = cells.length, self2 = this;
      while (n--)
        cells[n].pending(direction);
      var pipe = function(index2, error3, msg) {
        if (index2 === end)
          return callback.call(context, error3, msg);
        cells[index2][direction](error3, msg, function(err, m) {
          if (err)
            self2._stopped[direction] = true;
          pipe(index2 + step, err, m);
        });
      };
      pipe(start, null, message);
    };
    module2.exports = Pipeline;
  }
});

// node_modules/websocket-extensions/lib/websocket_extensions.js
var require_websocket_extensions = __commonJS({
  "node_modules/websocket-extensions/lib/websocket_extensions.js"(exports, module2) {
    init_shims();
    "use strict";
    var Parser = require_parser();
    var Pipeline = require_pipeline();
    var Extensions = function() {
      this._rsv1 = this._rsv2 = this._rsv3 = null;
      this._byName = {};
      this._inOrder = [];
      this._sessions = [];
      this._index = {};
    };
    Extensions.MESSAGE_OPCODES = [1, 2];
    var instance = {
      add: function(ext) {
        if (typeof ext.name !== "string")
          throw new TypeError("extension.name must be a string");
        if (ext.type !== "permessage")
          throw new TypeError('extension.type must be "permessage"');
        if (typeof ext.rsv1 !== "boolean")
          throw new TypeError("extension.rsv1 must be true or false");
        if (typeof ext.rsv2 !== "boolean")
          throw new TypeError("extension.rsv2 must be true or false");
        if (typeof ext.rsv3 !== "boolean")
          throw new TypeError("extension.rsv3 must be true or false");
        if (this._byName.hasOwnProperty(ext.name))
          throw new TypeError('An extension with name "' + ext.name + '" is already registered');
        this._byName[ext.name] = ext;
        this._inOrder.push(ext);
      },
      generateOffer: function() {
        var sessions = [], offer = [], index2 = {};
        this._inOrder.forEach(function(ext) {
          var session = ext.createClientSession();
          if (!session)
            return;
          var record = [ext, session];
          sessions.push(record);
          index2[ext.name] = record;
          var offers = session.generateOffer();
          offers = offers ? [].concat(offers) : [];
          offers.forEach(function(off) {
            offer.push(Parser.serializeParams(ext.name, off));
          }, this);
        }, this);
        this._sessions = sessions;
        this._index = index2;
        return offer.length > 0 ? offer.join(", ") : null;
      },
      activate: function(header) {
        var responses = Parser.parseHeader(header), sessions = [];
        responses.eachOffer(function(name, params) {
          var record = this._index[name];
          if (!record)
            throw new Error('Server sent an extension response for unknown extension "' + name + '"');
          var ext = record[0], session = record[1], reserved2 = this._reserved(ext);
          if (reserved2)
            throw new Error("Server sent two extension responses that use the RSV" + reserved2[0] + ' bit: "' + reserved2[1] + '" and "' + ext.name + '"');
          if (session.activate(params) !== true)
            throw new Error("Server sent unacceptable extension parameters: " + Parser.serializeParams(name, params));
          this._reserve(ext);
          sessions.push(record);
        }, this);
        this._sessions = sessions;
        this._pipeline = new Pipeline(sessions);
      },
      generateResponse: function(header) {
        var sessions = [], response = [], offers = Parser.parseHeader(header);
        this._inOrder.forEach(function(ext) {
          var offer = offers.byName(ext.name);
          if (offer.length === 0 || this._reserved(ext))
            return;
          var session = ext.createServerSession(offer);
          if (!session)
            return;
          this._reserve(ext);
          sessions.push([ext, session]);
          response.push(Parser.serializeParams(ext.name, session.generateResponse()));
        }, this);
        this._sessions = sessions;
        this._pipeline = new Pipeline(sessions);
        return response.length > 0 ? response.join(", ") : null;
      },
      validFrameRsv: function(frame) {
        var allowed = { rsv1: false, rsv2: false, rsv3: false }, ext;
        if (Extensions.MESSAGE_OPCODES.indexOf(frame.opcode) >= 0) {
          for (var i = 0, n = this._sessions.length; i < n; i++) {
            ext = this._sessions[i][0];
            allowed.rsv1 = allowed.rsv1 || ext.rsv1;
            allowed.rsv2 = allowed.rsv2 || ext.rsv2;
            allowed.rsv3 = allowed.rsv3 || ext.rsv3;
          }
        }
        return (allowed.rsv1 || !frame.rsv1) && (allowed.rsv2 || !frame.rsv2) && (allowed.rsv3 || !frame.rsv3);
      },
      processIncomingMessage: function(message, callback, context) {
        this._pipeline.processIncomingMessage(message, callback, context);
      },
      processOutgoingMessage: function(message, callback, context) {
        this._pipeline.processOutgoingMessage(message, callback, context);
      },
      close: function(callback, context) {
        if (!this._pipeline)
          return callback.call(context);
        this._pipeline.close(callback, context);
      },
      _reserve: function(ext) {
        this._rsv1 = this._rsv1 || ext.rsv1 && ext.name;
        this._rsv2 = this._rsv2 || ext.rsv2 && ext.name;
        this._rsv3 = this._rsv3 || ext.rsv3 && ext.name;
      },
      _reserved: function(ext) {
        if (this._rsv1 && ext.rsv1)
          return [1, this._rsv1];
        if (this._rsv2 && ext.rsv2)
          return [2, this._rsv2];
        if (this._rsv3 && ext.rsv3)
          return [3, this._rsv3];
        return false;
      }
    };
    for (key in instance)
      Extensions.prototype[key] = instance[key];
    var key;
    module2.exports = Extensions;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/hybi/frame.js
var require_frame = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/hybi/frame.js"(exports, module2) {
    init_shims();
    "use strict";
    var Frame = function() {
    };
    var instance = {
      final: false,
      rsv1: false,
      rsv2: false,
      rsv3: false,
      opcode: null,
      masked: false,
      maskingKey: null,
      lengthBytes: 1,
      length: 0,
      payload: null
    };
    for (key in instance)
      Frame.prototype[key] = instance[key];
    var key;
    module2.exports = Frame;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/hybi/message.js
var require_message = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/hybi/message.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var Message = function() {
      this.rsv1 = false;
      this.rsv2 = false;
      this.rsv3 = false;
      this.opcode = null;
      this.length = 0;
      this._chunks = [];
    };
    var instance = {
      read: function() {
        return this.data = this.data || Buffer2.concat(this._chunks, this.length);
      },
      pushFrame: function(frame) {
        this.rsv1 = this.rsv1 || frame.rsv1;
        this.rsv2 = this.rsv2 || frame.rsv2;
        this.rsv3 = this.rsv3 || frame.rsv3;
        if (this.opcode === null)
          this.opcode = frame.opcode;
        this._chunks.push(frame.payload);
        this.length += frame.length;
      }
    };
    for (key in instance)
      Message.prototype[key] = instance[key];
    var key;
    module2.exports = Message;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/hybi.js
var require_hybi = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/hybi.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var crypto = require("crypto");
    var util = require("util");
    var Extensions = require_websocket_extensions();
    var Base = require_base();
    var Frame = require_frame();
    var Message = require_message();
    var Hybi = function(request, url, options2) {
      Base.apply(this, arguments);
      this._extensions = new Extensions();
      this._stage = 0;
      this._masking = this._options.masking;
      this._protocols = this._options.protocols || [];
      this._requireMasking = this._options.requireMasking;
      this._pingCallbacks = {};
      if (typeof this._protocols === "string")
        this._protocols = this._protocols.split(/ *, */);
      if (!this._request)
        return;
      var protos = this._request.headers["sec-websocket-protocol"], supported = this._protocols;
      if (protos !== void 0) {
        if (typeof protos === "string")
          protos = protos.split(/ *, */);
        this.protocol = protos.filter(function(p) {
          return supported.indexOf(p) >= 0;
        })[0];
      }
      this.version = "hybi-" + Hybi.VERSION;
    };
    util.inherits(Hybi, Base);
    Hybi.VERSION = "13";
    Hybi.mask = function(payload, mask, offset) {
      if (!mask || mask.length === 0)
        return payload;
      offset = offset || 0;
      for (var i = 0, n = payload.length - offset; i < n; i++) {
        payload[offset + i] = payload[offset + i] ^ mask[i % 4];
      }
      return payload;
    };
    Hybi.generateAccept = function(key2) {
      var sha1 = crypto.createHash("sha1");
      sha1.update(key2 + Hybi.GUID);
      return sha1.digest("base64");
    };
    Hybi.GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    var instance = {
      FIN: 128,
      MASK: 128,
      RSV1: 64,
      RSV2: 32,
      RSV3: 16,
      OPCODE: 15,
      LENGTH: 127,
      OPCODES: {
        continuation: 0,
        text: 1,
        binary: 2,
        close: 8,
        ping: 9,
        pong: 10
      },
      OPCODE_CODES: [0, 1, 2, 8, 9, 10],
      MESSAGE_OPCODES: [0, 1, 2],
      OPENING_OPCODES: [1, 2],
      ERRORS: {
        normal_closure: 1e3,
        going_away: 1001,
        protocol_error: 1002,
        unacceptable: 1003,
        encoding_error: 1007,
        policy_violation: 1008,
        too_large: 1009,
        extension_error: 1010,
        unexpected_condition: 1011
      },
      ERROR_CODES: [1e3, 1001, 1002, 1003, 1007, 1008, 1009, 1010, 1011],
      DEFAULT_ERROR_CODE: 1e3,
      MIN_RESERVED_ERROR: 3e3,
      MAX_RESERVED_ERROR: 4999,
      UTF8_MATCH: /^([\x00-\x7F]|[\xC2-\xDF][\x80-\xBF]|\xE0[\xA0-\xBF][\x80-\xBF]|[\xE1-\xEC\xEE\xEF][\x80-\xBF]{2}|\xED[\x80-\x9F][\x80-\xBF]|\xF0[\x90-\xBF][\x80-\xBF]{2}|[\xF1-\xF3][\x80-\xBF]{3}|\xF4[\x80-\x8F][\x80-\xBF]{2})*$/,
      addExtension: function(extension) {
        this._extensions.add(extension);
        return true;
      },
      parse: function(chunk) {
        this._reader.put(chunk);
        var buffer = true;
        while (buffer) {
          switch (this._stage) {
            case 0:
              buffer = this._reader.read(1);
              if (buffer)
                this._parseOpcode(buffer[0]);
              break;
            case 1:
              buffer = this._reader.read(1);
              if (buffer)
                this._parseLength(buffer[0]);
              break;
            case 2:
              buffer = this._reader.read(this._frame.lengthBytes);
              if (buffer)
                this._parseExtendedLength(buffer);
              break;
            case 3:
              buffer = this._reader.read(4);
              if (buffer) {
                this._stage = 4;
                this._frame.maskingKey = buffer;
              }
              break;
            case 4:
              buffer = this._reader.read(this._frame.length);
              if (buffer) {
                this._stage = 0;
                this._emitFrame(buffer);
              }
              break;
            default:
              buffer = null;
          }
        }
      },
      text: function(message) {
        if (this.readyState > 1)
          return false;
        return this.frame(message, "text");
      },
      binary: function(message) {
        if (this.readyState > 1)
          return false;
        return this.frame(message, "binary");
      },
      ping: function(message, callback) {
        if (this.readyState > 1)
          return false;
        message = message || "";
        if (callback)
          this._pingCallbacks[message] = callback;
        return this.frame(message, "ping");
      },
      pong: function(message) {
        if (this.readyState > 1)
          return false;
        message = message || "";
        return this.frame(message, "pong");
      },
      close: function(reason, code) {
        reason = reason || "";
        code = code || this.ERRORS.normal_closure;
        if (this.readyState <= 0) {
          this.readyState = 3;
          this.emit("close", new Base.CloseEvent(code, reason));
          return true;
        } else if (this.readyState === 1) {
          this.readyState = 2;
          this._extensions.close(function() {
            this.frame(reason, "close", code);
          }, this);
          return true;
        } else {
          return false;
        }
      },
      frame: function(buffer, type, code) {
        if (this.readyState <= 0)
          return this._queue([buffer, type, code]);
        if (this.readyState > 2)
          return false;
        if (buffer instanceof Array)
          buffer = Buffer2.from(buffer);
        if (typeof buffer === "number")
          buffer = buffer.toString();
        var message = new Message(), isText = typeof buffer === "string", payload, copy;
        message.rsv1 = message.rsv2 = message.rsv3 = false;
        message.opcode = this.OPCODES[type || (isText ? "text" : "binary")];
        payload = isText ? Buffer2.from(buffer, "utf8") : buffer;
        if (code) {
          copy = payload;
          payload = Buffer2.allocUnsafe(2 + copy.length);
          payload.writeUInt16BE(code, 0);
          copy.copy(payload, 2);
        }
        message.data = payload;
        var onMessageReady = function(message2) {
          var frame = new Frame();
          frame.final = true;
          frame.rsv1 = message2.rsv1;
          frame.rsv2 = message2.rsv2;
          frame.rsv3 = message2.rsv3;
          frame.opcode = message2.opcode;
          frame.masked = !!this._masking;
          frame.length = message2.data.length;
          frame.payload = message2.data;
          if (frame.masked)
            frame.maskingKey = crypto.randomBytes(4);
          this._sendFrame(frame);
        };
        if (this.MESSAGE_OPCODES.indexOf(message.opcode) >= 0)
          this._extensions.processOutgoingMessage(message, function(error3, message2) {
            if (error3)
              return this._fail("extension_error", error3.message);
            onMessageReady.call(this, message2);
          }, this);
        else
          onMessageReady.call(this, message);
        return true;
      },
      _sendFrame: function(frame) {
        var length = frame.length, header = length <= 125 ? 2 : length <= 65535 ? 4 : 10, offset = header + (frame.masked ? 4 : 0), buffer = Buffer2.allocUnsafe(offset + length), masked = frame.masked ? this.MASK : 0;
        buffer[0] = (frame.final ? this.FIN : 0) | (frame.rsv1 ? this.RSV1 : 0) | (frame.rsv2 ? this.RSV2 : 0) | (frame.rsv3 ? this.RSV3 : 0) | frame.opcode;
        if (length <= 125) {
          buffer[1] = masked | length;
        } else if (length <= 65535) {
          buffer[1] = masked | 126;
          buffer.writeUInt16BE(length, 2);
        } else {
          buffer[1] = masked | 127;
          buffer.writeUInt32BE(Math.floor(length / 4294967296), 2);
          buffer.writeUInt32BE(length % 4294967296, 6);
        }
        frame.payload.copy(buffer, offset);
        if (frame.masked) {
          frame.maskingKey.copy(buffer, header);
          Hybi.mask(buffer, frame.maskingKey, offset);
        }
        this._write(buffer);
      },
      _handshakeResponse: function() {
        var secKey = this._request.headers["sec-websocket-key"], version = this._request.headers["sec-websocket-version"];
        if (version !== Hybi.VERSION)
          throw new Error("Unsupported WebSocket version: " + version);
        if (typeof secKey !== "string")
          throw new Error("Missing handshake request header: Sec-WebSocket-Key");
        this._headers.set("Upgrade", "websocket");
        this._headers.set("Connection", "Upgrade");
        this._headers.set("Sec-WebSocket-Accept", Hybi.generateAccept(secKey));
        if (this.protocol)
          this._headers.set("Sec-WebSocket-Protocol", this.protocol);
        var extensions = this._extensions.generateResponse(this._request.headers["sec-websocket-extensions"]);
        if (extensions)
          this._headers.set("Sec-WebSocket-Extensions", extensions);
        var start = "HTTP/1.1 101 Switching Protocols", headers = [start, this._headers.toString(), ""];
        return Buffer2.from(headers.join("\r\n"), "utf8");
      },
      _shutdown: function(code, reason, error3) {
        delete this._frame;
        delete this._message;
        this._stage = 5;
        var sendCloseFrame = this.readyState === 1;
        this.readyState = 2;
        this._extensions.close(function() {
          if (sendCloseFrame)
            this.frame(reason, "close", code);
          this.readyState = 3;
          if (error3)
            this.emit("error", new Error(reason));
          this.emit("close", new Base.CloseEvent(code, reason));
        }, this);
      },
      _fail: function(type, message) {
        if (this.readyState > 1)
          return;
        this._shutdown(this.ERRORS[type], message, true);
      },
      _parseOpcode: function(octet) {
        var rsvs = [this.RSV1, this.RSV2, this.RSV3].map(function(rsv) {
          return (octet & rsv) === rsv;
        });
        var frame = this._frame = new Frame();
        frame.final = (octet & this.FIN) === this.FIN;
        frame.rsv1 = rsvs[0];
        frame.rsv2 = rsvs[1];
        frame.rsv3 = rsvs[2];
        frame.opcode = octet & this.OPCODE;
        this._stage = 1;
        if (!this._extensions.validFrameRsv(frame))
          return this._fail("protocol_error", "One or more reserved bits are on: reserved1 = " + (frame.rsv1 ? 1 : 0) + ", reserved2 = " + (frame.rsv2 ? 1 : 0) + ", reserved3 = " + (frame.rsv3 ? 1 : 0));
        if (this.OPCODE_CODES.indexOf(frame.opcode) < 0)
          return this._fail("protocol_error", "Unrecognized frame opcode: " + frame.opcode);
        if (this.MESSAGE_OPCODES.indexOf(frame.opcode) < 0 && !frame.final)
          return this._fail("protocol_error", "Received fragmented control frame: opcode = " + frame.opcode);
        if (this._message && this.OPENING_OPCODES.indexOf(frame.opcode) >= 0)
          return this._fail("protocol_error", "Received new data frame but previous continuous frame is unfinished");
      },
      _parseLength: function(octet) {
        var frame = this._frame;
        frame.masked = (octet & this.MASK) === this.MASK;
        frame.length = octet & this.LENGTH;
        if (frame.length >= 0 && frame.length <= 125) {
          this._stage = frame.masked ? 3 : 4;
          if (!this._checkFrameLength())
            return;
        } else {
          this._stage = 2;
          frame.lengthBytes = frame.length === 126 ? 2 : 8;
        }
        if (this._requireMasking && !frame.masked)
          return this._fail("unacceptable", "Received unmasked frame but masking is required");
      },
      _parseExtendedLength: function(buffer) {
        var frame = this._frame;
        frame.length = this._readUInt(buffer);
        this._stage = frame.masked ? 3 : 4;
        if (this.MESSAGE_OPCODES.indexOf(frame.opcode) < 0 && frame.length > 125)
          return this._fail("protocol_error", "Received control frame having too long payload: " + frame.length);
        if (!this._checkFrameLength())
          return;
      },
      _checkFrameLength: function() {
        var length = this._message ? this._message.length : 0;
        if (length + this._frame.length > this._maxLength) {
          this._fail("too_large", "WebSocket frame length too large");
          return false;
        } else {
          return true;
        }
      },
      _emitFrame: function(buffer) {
        var frame = this._frame, payload = frame.payload = Hybi.mask(buffer, frame.maskingKey), opcode = frame.opcode, message, code, reason, callbacks, callback;
        delete this._frame;
        if (opcode === this.OPCODES.continuation) {
          if (!this._message)
            return this._fail("protocol_error", "Received unexpected continuation frame");
          this._message.pushFrame(frame);
        }
        if (opcode === this.OPCODES.text || opcode === this.OPCODES.binary) {
          this._message = new Message();
          this._message.pushFrame(frame);
        }
        if (frame.final && this.MESSAGE_OPCODES.indexOf(opcode) >= 0)
          return this._emitMessage(this._message);
        if (opcode === this.OPCODES.close) {
          code = payload.length >= 2 ? payload.readUInt16BE(0) : null;
          reason = payload.length > 2 ? this._encode(payload.slice(2)) : null;
          if (!(payload.length === 0) && !(code !== null && code >= this.MIN_RESERVED_ERROR && code <= this.MAX_RESERVED_ERROR) && this.ERROR_CODES.indexOf(code) < 0)
            code = this.ERRORS.protocol_error;
          if (payload.length > 125 || payload.length > 2 && !reason)
            code = this.ERRORS.protocol_error;
          this._shutdown(code || this.DEFAULT_ERROR_CODE, reason || "");
        }
        if (opcode === this.OPCODES.ping) {
          this.frame(payload, "pong");
          this.emit("ping", new Base.PingEvent(payload.toString()));
        }
        if (opcode === this.OPCODES.pong) {
          callbacks = this._pingCallbacks;
          message = this._encode(payload);
          callback = callbacks[message];
          delete callbacks[message];
          if (callback)
            callback();
          this.emit("pong", new Base.PongEvent(payload.toString()));
        }
      },
      _emitMessage: function(message) {
        var message = this._message;
        message.read();
        delete this._message;
        this._extensions.processIncomingMessage(message, function(error3, message2) {
          if (error3)
            return this._fail("extension_error", error3.message);
          var payload = message2.data;
          if (message2.opcode === this.OPCODES.text)
            payload = this._encode(payload);
          if (payload === null)
            return this._fail("encoding_error", "Could not decode a text frame as UTF-8");
          else
            this.emit("message", new Base.MessageEvent(payload));
        }, this);
      },
      _encode: function(buffer) {
        try {
          var string = buffer.toString("binary", 0, buffer.length);
          if (!this.UTF8_MATCH.test(string))
            return null;
        } catch (e) {
        }
        return buffer.toString("utf8", 0, buffer.length);
      },
      _readUInt: function(buffer) {
        if (buffer.length === 2)
          return buffer.readUInt16BE(0);
        return buffer.readUInt32BE(0) * 4294967296 + buffer.readUInt32BE(4);
      }
    };
    for (key in instance)
      Hybi.prototype[key] = instance[key];
    var key;
    module2.exports = Hybi;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/proxy.js
var require_proxy = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/proxy.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var Stream2 = require("stream").Stream;
    var url = require("url");
    var util = require("util");
    var Base = require_base();
    var Headers2 = require_headers();
    var HttpParser = require_http_parser2();
    var PORTS = { "ws:": 80, "wss:": 443 };
    var Proxy2 = function(client, origin, options2) {
      this._client = client;
      this._http = new HttpParser("response");
      this._origin = typeof client.url === "object" ? client.url : url.parse(client.url);
      this._url = typeof origin === "object" ? origin : url.parse(origin);
      this._options = options2 || {};
      this._state = 0;
      this.readable = this.writable = true;
      this._paused = false;
      this._headers = new Headers2();
      this._headers.set("Host", this._origin.host);
      this._headers.set("Connection", "keep-alive");
      this._headers.set("Proxy-Connection", "keep-alive");
      var auth = this._url.auth && Buffer2.from(this._url.auth, "utf8").toString("base64");
      if (auth)
        this._headers.set("Proxy-Authorization", "Basic " + auth);
    };
    util.inherits(Proxy2, Stream2);
    var instance = {
      setHeader: function(name, value) {
        if (this._state !== 0)
          return false;
        this._headers.set(name, value);
        return true;
      },
      start: function() {
        if (this._state !== 0)
          return false;
        this._state = 1;
        var origin = this._origin, port = origin.port || PORTS[origin.protocol], start = "CONNECT " + origin.hostname + ":" + port + " HTTP/1.1";
        var headers = [start, this._headers.toString(), ""];
        this.emit("data", Buffer2.from(headers.join("\r\n"), "utf8"));
        return true;
      },
      pause: function() {
        this._paused = true;
      },
      resume: function() {
        this._paused = false;
        this.emit("drain");
      },
      write: function(chunk) {
        if (!this.writable)
          return false;
        this._http.parse(chunk);
        if (!this._http.isComplete())
          return !this._paused;
        this.statusCode = this._http.statusCode;
        this.headers = this._http.headers;
        if (this.statusCode === 200) {
          this.emit("connect", new Base.ConnectEvent());
        } else {
          var message = "Can't establish a connection to the server at " + this._origin.href;
          this.emit("error", new Error(message));
        }
        this.end();
        return !this._paused;
      },
      end: function(chunk) {
        if (!this.writable)
          return;
        if (chunk !== void 0)
          this.write(chunk);
        this.readable = this.writable = false;
        this.emit("close");
        this.emit("end");
      },
      destroy: function() {
        this.end();
      }
    };
    for (key in instance)
      Proxy2.prototype[key] = instance[key];
    var key;
    module2.exports = Proxy2;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/client.js
var require_client = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/client.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var crypto = require("crypto");
    var url = require("url");
    var util = require("util");
    var HttpParser = require_http_parser2();
    var Base = require_base();
    var Hybi = require_hybi();
    var Proxy2 = require_proxy();
    var Client = function(_url, options2) {
      this.version = "hybi-" + Hybi.VERSION;
      Hybi.call(this, null, _url, options2);
      this.readyState = -1;
      this._key = Client.generateKey();
      this._accept = Hybi.generateAccept(this._key);
      this._http = new HttpParser("response");
      var uri = url.parse(this.url), auth = uri.auth && Buffer2.from(uri.auth, "utf8").toString("base64");
      if (this.VALID_PROTOCOLS.indexOf(uri.protocol) < 0)
        throw new Error(this.url + " is not a valid WebSocket URL");
      this._pathname = (uri.pathname || "/") + (uri.search || "");
      this._headers.set("Host", uri.host);
      this._headers.set("Upgrade", "websocket");
      this._headers.set("Connection", "Upgrade");
      this._headers.set("Sec-WebSocket-Key", this._key);
      this._headers.set("Sec-WebSocket-Version", Hybi.VERSION);
      if (this._protocols.length > 0)
        this._headers.set("Sec-WebSocket-Protocol", this._protocols.join(", "));
      if (auth)
        this._headers.set("Authorization", "Basic " + auth);
    };
    util.inherits(Client, Hybi);
    Client.generateKey = function() {
      return crypto.randomBytes(16).toString("base64");
    };
    var instance = {
      VALID_PROTOCOLS: ["ws:", "wss:"],
      proxy: function(origin, options2) {
        return new Proxy2(this, origin, options2);
      },
      start: function() {
        if (this.readyState !== -1)
          return false;
        this._write(this._handshakeRequest());
        this.readyState = 0;
        return true;
      },
      parse: function(chunk) {
        if (this.readyState === 3)
          return;
        if (this.readyState > 0)
          return Hybi.prototype.parse.call(this, chunk);
        this._http.parse(chunk);
        if (!this._http.isComplete())
          return;
        this._validateHandshake();
        if (this.readyState === 3)
          return;
        this._open();
        this.parse(this._http.body);
      },
      _handshakeRequest: function() {
        var extensions = this._extensions.generateOffer();
        if (extensions)
          this._headers.set("Sec-WebSocket-Extensions", extensions);
        var start = "GET " + this._pathname + " HTTP/1.1", headers = [start, this._headers.toString(), ""];
        return Buffer2.from(headers.join("\r\n"), "utf8");
      },
      _failHandshake: function(message) {
        message = "Error during WebSocket handshake: " + message;
        this.readyState = 3;
        this.emit("error", new Error(message));
        this.emit("close", new Base.CloseEvent(this.ERRORS.protocol_error, message));
      },
      _validateHandshake: function() {
        this.statusCode = this._http.statusCode;
        this.headers = this._http.headers;
        if (this._http.error)
          return this._failHandshake(this._http.error.message);
        if (this._http.statusCode !== 101)
          return this._failHandshake("Unexpected response code: " + this._http.statusCode);
        var headers = this._http.headers, upgrade = headers["upgrade"] || "", connection = headers["connection"] || "", accept = headers["sec-websocket-accept"] || "", protocol = headers["sec-websocket-protocol"] || "";
        if (upgrade === "")
          return this._failHandshake("'Upgrade' header is missing");
        if (upgrade.toLowerCase() !== "websocket")
          return this._failHandshake("'Upgrade' header value is not 'WebSocket'");
        if (connection === "")
          return this._failHandshake("'Connection' header is missing");
        if (connection.toLowerCase() !== "upgrade")
          return this._failHandshake("'Connection' header value is not 'Upgrade'");
        if (accept !== this._accept)
          return this._failHandshake("Sec-WebSocket-Accept mismatch");
        this.protocol = null;
        if (protocol !== "") {
          if (this._protocols.indexOf(protocol) < 0)
            return this._failHandshake("Sec-WebSocket-Protocol mismatch");
          else
            this.protocol = protocol;
        }
        try {
          this._extensions.activate(this.headers["sec-websocket-extensions"]);
        } catch (e) {
          return this._failHandshake(e.message);
        }
      }
    };
    for (key in instance)
      Client.prototype[key] = instance[key];
    var key;
    module2.exports = Client;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/draft75.js
var require_draft75 = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/draft75.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var Base = require_base();
    var util = require("util");
    var Draft75 = function(request, url, options2) {
      Base.apply(this, arguments);
      this._stage = 0;
      this.version = "hixie-75";
      this._headers.set("Upgrade", "WebSocket");
      this._headers.set("Connection", "Upgrade");
      this._headers.set("WebSocket-Origin", this._request.headers.origin);
      this._headers.set("WebSocket-Location", this.url);
    };
    util.inherits(Draft75, Base);
    var instance = {
      close: function() {
        if (this.readyState === 3)
          return false;
        this.readyState = 3;
        this.emit("close", new Base.CloseEvent(null, null));
        return true;
      },
      parse: function(chunk) {
        if (this.readyState > 1)
          return;
        this._reader.put(chunk);
        this._reader.eachByte(function(octet) {
          var message;
          switch (this._stage) {
            case -1:
              this._body.push(octet);
              this._sendHandshakeBody();
              break;
            case 0:
              this._parseLeadingByte(octet);
              break;
            case 1:
              this._length = (octet & 127) + 128 * this._length;
              if (this._closing && this._length === 0) {
                return this.close();
              } else if ((octet & 128) !== 128) {
                if (this._length === 0) {
                  this._stage = 0;
                } else {
                  this._skipped = 0;
                  this._stage = 2;
                }
              }
              break;
            case 2:
              if (octet === 255) {
                this._stage = 0;
                message = Buffer2.from(this._buffer).toString("utf8", 0, this._buffer.length);
                this.emit("message", new Base.MessageEvent(message));
              } else {
                if (this._length) {
                  this._skipped += 1;
                  if (this._skipped === this._length)
                    this._stage = 0;
                } else {
                  this._buffer.push(octet);
                  if (this._buffer.length > this._maxLength)
                    return this.close();
                }
              }
              break;
          }
        }, this);
      },
      frame: function(buffer) {
        if (this.readyState === 0)
          return this._queue([buffer]);
        if (this.readyState > 1)
          return false;
        if (typeof buffer !== "string")
          buffer = buffer.toString();
        var length = Buffer2.byteLength(buffer), frame = Buffer2.allocUnsafe(length + 2);
        frame[0] = 0;
        frame.write(buffer, 1);
        frame[frame.length - 1] = 255;
        this._write(frame);
        return true;
      },
      _handshakeResponse: function() {
        var start = "HTTP/1.1 101 Web Socket Protocol Handshake", headers = [start, this._headers.toString(), ""];
        return Buffer2.from(headers.join("\r\n"), "utf8");
      },
      _parseLeadingByte: function(octet) {
        if ((octet & 128) === 128) {
          this._length = 0;
          this._stage = 1;
        } else {
          delete this._length;
          delete this._skipped;
          this._buffer = [];
          this._stage = 2;
        }
      }
    };
    for (key in instance)
      Draft75.prototype[key] = instance[key];
    var key;
    module2.exports = Draft75;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/draft76.js
var require_draft76 = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/draft76.js"(exports, module2) {
    init_shims();
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var Base = require_base();
    var Draft75 = require_draft75();
    var crypto = require("crypto");
    var util = require("util");
    var numberFromKey = function(key2) {
      return parseInt((key2.match(/[0-9]/g) || []).join(""), 10);
    };
    var spacesInKey = function(key2) {
      return (key2.match(/ /g) || []).length;
    };
    var Draft76 = function(request, url, options2) {
      Draft75.apply(this, arguments);
      this._stage = -1;
      this._body = [];
      this.version = "hixie-76";
      this._headers.clear();
      this._headers.set("Upgrade", "WebSocket");
      this._headers.set("Connection", "Upgrade");
      this._headers.set("Sec-WebSocket-Origin", this._request.headers.origin);
      this._headers.set("Sec-WebSocket-Location", this.url);
    };
    util.inherits(Draft76, Draft75);
    var instance = {
      BODY_SIZE: 8,
      start: function() {
        if (!Draft75.prototype.start.call(this))
          return false;
        this._started = true;
        this._sendHandshakeBody();
        return true;
      },
      close: function() {
        if (this.readyState === 3)
          return false;
        if (this.readyState === 1)
          this._write(Buffer2.from([255, 0]));
        this.readyState = 3;
        this.emit("close", new Base.CloseEvent(null, null));
        return true;
      },
      _handshakeResponse: function() {
        var headers = this._request.headers, key1 = headers["sec-websocket-key1"], key2 = headers["sec-websocket-key2"];
        if (!key1)
          throw new Error("Missing required header: Sec-WebSocket-Key1");
        if (!key2)
          throw new Error("Missing required header: Sec-WebSocket-Key2");
        var number1 = numberFromKey(key1), spaces1 = spacesInKey(key1), number2 = numberFromKey(key2), spaces2 = spacesInKey(key2);
        if (number1 % spaces1 !== 0 || number2 % spaces2 !== 0)
          throw new Error("Client sent invalid Sec-WebSocket-Key headers");
        this._keyValues = [number1 / spaces1, number2 / spaces2];
        var start = "HTTP/1.1 101 WebSocket Protocol Handshake", headers = [start, this._headers.toString(), ""];
        return Buffer2.from(headers.join("\r\n"), "binary");
      },
      _handshakeSignature: function() {
        if (this._body.length < this.BODY_SIZE)
          return null;
        var md5 = crypto.createHash("md5"), buffer = Buffer2.allocUnsafe(8 + this.BODY_SIZE);
        buffer.writeUInt32BE(this._keyValues[0], 0);
        buffer.writeUInt32BE(this._keyValues[1], 4);
        Buffer2.from(this._body).copy(buffer, 8, 0, this.BODY_SIZE);
        md5.update(buffer);
        return Buffer2.from(md5.digest("binary"), "binary");
      },
      _sendHandshakeBody: function() {
        if (!this._started)
          return;
        var signature = this._handshakeSignature();
        if (!signature)
          return;
        this._write(signature);
        this._stage = 0;
        this._open();
        if (this._body.length > this.BODY_SIZE)
          this.parse(this._body.slice(this.BODY_SIZE));
      },
      _parseLeadingByte: function(octet) {
        if (octet !== 255)
          return Draft75.prototype._parseLeadingByte.call(this, octet);
        this._closing = true;
        this._length = 0;
        this._stage = 1;
      }
    };
    for (key in instance)
      Draft76.prototype[key] = instance[key];
    var key;
    module2.exports = Draft76;
  }
});

// node_modules/websocket-driver/lib/websocket/driver/server.js
var require_server = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver/server.js"(exports, module2) {
    init_shims();
    "use strict";
    var util = require("util");
    var HttpParser = require_http_parser2();
    var Base = require_base();
    var Draft75 = require_draft75();
    var Draft76 = require_draft76();
    var Hybi = require_hybi();
    var Server = function(options2) {
      Base.call(this, null, null, options2);
      this._http = new HttpParser("request");
    };
    util.inherits(Server, Base);
    var instance = {
      EVENTS: ["open", "message", "error", "close", "ping", "pong"],
      _bindEventListeners: function() {
        this.messages.on("error", function() {
        });
        this.on("error", function() {
        });
      },
      parse: function(chunk) {
        if (this._delegate)
          return this._delegate.parse(chunk);
        this._http.parse(chunk);
        if (!this._http.isComplete())
          return;
        this.method = this._http.method;
        this.url = this._http.url;
        this.headers = this._http.headers;
        this.body = this._http.body;
        var self2 = this;
        this._delegate = Server.http(this, this._options);
        this._delegate.messages = this.messages;
        this._delegate.io = this.io;
        this._open();
        this.EVENTS.forEach(function(event) {
          this._delegate.on(event, function(e) {
            self2.emit(event, e);
          });
        }, this);
        this.protocol = this._delegate.protocol;
        this.version = this._delegate.version;
        this.parse(this._http.body);
        this.emit("connect", new Base.ConnectEvent());
      },
      _open: function() {
        this.__queue.forEach(function(msg) {
          this._delegate[msg[0]].apply(this._delegate, msg[1]);
        }, this);
        this.__queue = [];
      }
    };
    ["addExtension", "setHeader", "start", "frame", "text", "binary", "ping", "close"].forEach(function(method) {
      instance[method] = function() {
        if (this._delegate) {
          return this._delegate[method].apply(this._delegate, arguments);
        } else {
          this.__queue.push([method, arguments]);
          return true;
        }
      };
    });
    for (key in instance)
      Server.prototype[key] = instance[key];
    var key;
    Server.isSecureRequest = function(request) {
      if (request.connection && request.connection.authorized !== void 0)
        return true;
      if (request.socket && request.socket.secure)
        return true;
      var headers = request.headers;
      if (!headers)
        return false;
      if (headers["https"] === "on")
        return true;
      if (headers["x-forwarded-ssl"] === "on")
        return true;
      if (headers["x-forwarded-scheme"] === "https")
        return true;
      if (headers["x-forwarded-proto"] === "https")
        return true;
      return false;
    };
    Server.determineUrl = function(request) {
      var scheme = this.isSecureRequest(request) ? "wss:" : "ws:";
      return scheme + "//" + request.headers.host + request.url;
    };
    Server.http = function(request, options2) {
      options2 = options2 || {};
      if (options2.requireMasking === void 0)
        options2.requireMasking = true;
      var headers = request.headers, version = headers["sec-websocket-version"], key2 = headers["sec-websocket-key"], key1 = headers["sec-websocket-key1"], key22 = headers["sec-websocket-key2"], url = this.determineUrl(request);
      if (version || key2)
        return new Hybi(request, url, options2);
      else if (key1 || key22)
        return new Draft76(request, url, options2);
      else
        return new Draft75(request, url, options2);
    };
    module2.exports = Server;
  }
});

// node_modules/websocket-driver/lib/websocket/driver.js
var require_driver = __commonJS({
  "node_modules/websocket-driver/lib/websocket/driver.js"(exports, module2) {
    init_shims();
    "use strict";
    var Base = require_base();
    var Client = require_client();
    var Server = require_server();
    var Driver = {
      client: function(url, options2) {
        options2 = options2 || {};
        if (options2.masking === void 0)
          options2.masking = true;
        return new Client(url, options2);
      },
      server: function(options2) {
        options2 = options2 || {};
        if (options2.requireMasking === void 0)
          options2.requireMasking = true;
        return new Server(options2);
      },
      http: function() {
        return Server.http.apply(Server, arguments);
      },
      isSecureRequest: function(request) {
        return Server.isSecureRequest(request);
      },
      isWebSocket: function(request) {
        return Base.isWebSocket(request);
      },
      validateOptions: function(options2, validKeys) {
        Base.validateOptions(options2, validKeys);
      }
    };
    module2.exports = Driver;
  }
});

// node_modules/faye-websocket/lib/faye/websocket/api/event.js
var require_event = __commonJS({
  "node_modules/faye-websocket/lib/faye/websocket/api/event.js"(exports, module2) {
    init_shims();
    "use strict";
    var Event = function(eventType, options2) {
      this.type = eventType;
      for (var key in options2)
        this[key] = options2[key];
    };
    Event.prototype.initEvent = function(eventType, canBubble, cancelable) {
      this.type = eventType;
      this.bubbles = canBubble;
      this.cancelable = cancelable;
    };
    Event.prototype.stopPropagation = function() {
    };
    Event.prototype.preventDefault = function() {
    };
    Event.CAPTURING_PHASE = 1;
    Event.AT_TARGET = 2;
    Event.BUBBLING_PHASE = 3;
    module2.exports = Event;
  }
});

// node_modules/faye-websocket/lib/faye/websocket/api/event_target.js
var require_event_target = __commonJS({
  "node_modules/faye-websocket/lib/faye/websocket/api/event_target.js"(exports, module2) {
    init_shims();
    "use strict";
    var Event = require_event();
    var EventTarget = {
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      addEventListener: function(eventType, listener, useCapture) {
        this.on(eventType, listener);
      },
      removeEventListener: function(eventType, listener, useCapture) {
        this.removeListener(eventType, listener);
      },
      dispatchEvent: function(event) {
        event.target = event.currentTarget = this;
        event.eventPhase = Event.AT_TARGET;
        if (this["on" + event.type])
          this["on" + event.type](event);
        this.emit(event.type, event);
      }
    };
    module2.exports = EventTarget;
  }
});

// node_modules/faye-websocket/lib/faye/websocket/api.js
var require_api = __commonJS({
  "node_modules/faye-websocket/lib/faye/websocket/api.js"(exports, module2) {
    init_shims();
    "use strict";
    var Stream2 = require("stream").Stream;
    var util = require("util");
    var driver = require_driver();
    var EventTarget = require_event_target();
    var Event = require_event();
    var API = function(options2) {
      options2 = options2 || {};
      driver.validateOptions(options2, ["headers", "extensions", "maxLength", "ping", "proxy", "tls", "ca"]);
      this.readable = this.writable = true;
      var headers = options2.headers;
      if (headers) {
        for (var name in headers)
          this._driver.setHeader(name, headers[name]);
      }
      var extensions = options2.extensions;
      if (extensions) {
        [].concat(extensions).forEach(this._driver.addExtension, this._driver);
      }
      this._ping = options2.ping;
      this._pingId = 0;
      this.readyState = API.CONNECTING;
      this.bufferedAmount = 0;
      this.protocol = "";
      this.url = this._driver.url;
      this.version = this._driver.version;
      var self2 = this;
      this._driver.on("open", function(e) {
        self2._open();
      });
      this._driver.on("message", function(e) {
        self2._receiveMessage(e.data);
      });
      this._driver.on("close", function(e) {
        self2._beginClose(e.reason, e.code);
      });
      this._driver.on("error", function(error3) {
        self2._emitError(error3.message);
      });
      this.on("error", function() {
      });
      this._driver.messages.on("drain", function() {
        self2.emit("drain");
      });
      if (this._ping)
        this._pingTimer = setInterval(function() {
          self2._pingId += 1;
          self2.ping(self2._pingId.toString());
        }, this._ping * 1e3);
      this._configureStream();
      if (!this._proxy) {
        this._stream.pipe(this._driver.io);
        this._driver.io.pipe(this._stream);
      }
    };
    util.inherits(API, Stream2);
    API.CONNECTING = 0;
    API.OPEN = 1;
    API.CLOSING = 2;
    API.CLOSED = 3;
    API.CLOSE_TIMEOUT = 3e4;
    var instance = {
      write: function(data) {
        return this.send(data);
      },
      end: function(data) {
        if (data !== void 0)
          this.send(data);
        this.close();
      },
      pause: function() {
        return this._driver.messages.pause();
      },
      resume: function() {
        return this._driver.messages.resume();
      },
      send: function(data) {
        if (this.readyState > API.OPEN)
          return false;
        if (!(data instanceof Buffer))
          data = String(data);
        return this._driver.messages.write(data);
      },
      ping: function(message, callback) {
        if (this.readyState > API.OPEN)
          return false;
        return this._driver.ping(message, callback);
      },
      close: function(code, reason) {
        if (code === void 0)
          code = 1e3;
        if (reason === void 0)
          reason = "";
        if (code !== 1e3 && (code < 3e3 || code > 4999))
          throw new Error("Failed to execute 'close' on WebSocket: The code must be either 1000, or between 3000 and 4999. " + code + " is neither.");
        if (this.readyState !== API.CLOSED)
          this.readyState = API.CLOSING;
        var self2 = this;
        this._closeTimer = setTimeout(function() {
          self2._beginClose("", 1006);
        }, API.CLOSE_TIMEOUT);
        this._driver.close(reason, code);
      },
      _configureStream: function() {
        var self2 = this;
        this._stream.setTimeout(0);
        this._stream.setNoDelay(true);
        ["close", "end"].forEach(function(event) {
          this._stream.on(event, function() {
            self2._finalizeClose();
          });
        }, this);
        this._stream.on("error", function(error3) {
          self2._emitError("Network error: " + self2.url + ": " + error3.message);
          self2._finalizeClose();
        });
      },
      _open: function() {
        if (this.readyState !== API.CONNECTING)
          return;
        this.readyState = API.OPEN;
        this.protocol = this._driver.protocol || "";
        var event = new Event("open");
        event.initEvent("open", false, false);
        this.dispatchEvent(event);
      },
      _receiveMessage: function(data) {
        if (this.readyState > API.OPEN)
          return false;
        if (this.readable)
          this.emit("data", data);
        var event = new Event("message", { data });
        event.initEvent("message", false, false);
        this.dispatchEvent(event);
      },
      _emitError: function(message) {
        if (this.readyState >= API.CLOSING)
          return;
        var event = new Event("error", { message });
        event.initEvent("error", false, false);
        this.dispatchEvent(event);
      },
      _beginClose: function(reason, code) {
        if (this.readyState === API.CLOSED)
          return;
        this.readyState = API.CLOSING;
        this._closeParams = [reason, code];
        if (this._stream) {
          this._stream.destroy();
          if (!this._stream.readable)
            this._finalizeClose();
        }
      },
      _finalizeClose: function() {
        if (this.readyState === API.CLOSED)
          return;
        this.readyState = API.CLOSED;
        if (this._closeTimer)
          clearTimeout(this._closeTimer);
        if (this._pingTimer)
          clearInterval(this._pingTimer);
        if (this._stream)
          this._stream.end();
        if (this.readable)
          this.emit("end");
        this.readable = this.writable = false;
        var reason = this._closeParams ? this._closeParams[0] : "", code = this._closeParams ? this._closeParams[1] : 1006;
        var event = new Event("close", { code, reason });
        event.initEvent("close", false, false);
        this.dispatchEvent(event);
      }
    };
    for (method in instance)
      API.prototype[method] = instance[method];
    var method;
    for (key in EventTarget)
      API.prototype[key] = EventTarget[key];
    var key;
    module2.exports = API;
  }
});

// node_modules/faye-websocket/lib/faye/websocket/client.js
var require_client2 = __commonJS({
  "node_modules/faye-websocket/lib/faye/websocket/client.js"(exports, module2) {
    init_shims();
    "use strict";
    var util = require("util");
    var net = require("net");
    var tls = require("tls");
    var url = require("url");
    var driver = require_driver();
    var API = require_api();
    var Event = require_event();
    var DEFAULT_PORTS = { "http:": 80, "https:": 443, "ws:": 80, "wss:": 443 };
    var SECURE_PROTOCOLS = ["https:", "wss:"];
    var Client = function(_url, protocols, options2) {
      options2 = options2 || {};
      this.url = _url;
      this._driver = driver.client(this.url, { maxLength: options2.maxLength, protocols });
      ["open", "error"].forEach(function(event) {
        this._driver.on(event, function() {
          self2.headers = self2._driver.headers;
          self2.statusCode = self2._driver.statusCode;
        });
      }, this);
      var proxy = options2.proxy || {}, endpoint = url.parse(proxy.origin || this.url), port = endpoint.port || DEFAULT_PORTS[endpoint.protocol], secure = SECURE_PROTOCOLS.indexOf(endpoint.protocol) >= 0, onConnect = function() {
        self2._onConnect();
      }, netOptions = options2.net || {}, originTLS = options2.tls || {}, socketTLS = proxy.origin ? proxy.tls || {} : originTLS, self2 = this;
      netOptions.host = socketTLS.host = endpoint.hostname;
      netOptions.port = socketTLS.port = port;
      originTLS.ca = originTLS.ca || options2.ca;
      socketTLS.servername = socketTLS.servername || endpoint.hostname;
      this._stream = secure ? tls.connect(socketTLS, onConnect) : net.connect(netOptions, onConnect);
      if (proxy.origin)
        this._configureProxy(proxy, originTLS);
      API.call(this, options2);
    };
    util.inherits(Client, API);
    Client.prototype._onConnect = function() {
      var worker = this._proxy || this._driver;
      worker.start();
    };
    Client.prototype._configureProxy = function(proxy, originTLS) {
      var uri = url.parse(this.url), secure = SECURE_PROTOCOLS.indexOf(uri.protocol) >= 0, self2 = this, name;
      this._proxy = this._driver.proxy(proxy.origin);
      if (proxy.headers) {
        for (name in proxy.headers)
          this._proxy.setHeader(name, proxy.headers[name]);
      }
      this._proxy.pipe(this._stream, { end: false });
      this._stream.pipe(this._proxy);
      this._proxy.on("connect", function() {
        if (secure) {
          var options2 = { socket: self2._stream, servername: uri.hostname };
          for (name in originTLS)
            options2[name] = originTLS[name];
          self2._stream = tls.connect(options2);
          self2._configureStream();
        }
        self2._driver.io.pipe(self2._stream);
        self2._stream.pipe(self2._driver.io);
        self2._driver.start();
      });
      this._proxy.on("error", function(error3) {
        self2._driver.emit("error", error3);
      });
    };
    module2.exports = Client;
  }
});

// node_modules/faye-websocket/lib/faye/eventsource.js
var require_eventsource = __commonJS({
  "node_modules/faye-websocket/lib/faye/eventsource.js"(exports, module2) {
    init_shims();
    "use strict";
    var Stream2 = require("stream").Stream;
    var util = require("util");
    var driver = require_driver();
    var Headers2 = require_headers();
    var API = require_api();
    var EventTarget = require_event_target();
    var Event = require_event();
    var EventSource = function(request, response, options2) {
      this.writable = true;
      options2 = options2 || {};
      this._stream = response.socket;
      this._ping = options2.ping || this.DEFAULT_PING;
      this._retry = options2.retry || this.DEFAULT_RETRY;
      var scheme = driver.isSecureRequest(request) ? "https:" : "http:";
      this.url = scheme + "//" + request.headers.host + request.url;
      this.lastEventId = request.headers["last-event-id"] || "";
      this.readyState = API.CONNECTING;
      var headers = new Headers2(), self2 = this;
      if (options2.headers) {
        for (var key2 in options2.headers)
          headers.set(key2, options2.headers[key2]);
      }
      if (!this._stream || !this._stream.writable)
        return;
      process.nextTick(function() {
        self2._open();
      });
      this._stream.setTimeout(0);
      this._stream.setNoDelay(true);
      var handshake = "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache, no-store\r\nConnection: close\r\n" + headers.toString() + "\r\nretry: " + Math.floor(this._retry * 1e3) + "\r\n\r\n";
      this._write(handshake);
      this._stream.on("drain", function() {
        self2.emit("drain");
      });
      if (this._ping)
        this._pingTimer = setInterval(function() {
          self2.ping();
        }, this._ping * 1e3);
      ["error", "end"].forEach(function(event) {
        self2._stream.on(event, function() {
          self2.close();
        });
      });
    };
    util.inherits(EventSource, Stream2);
    EventSource.isEventSource = function(request) {
      if (request.method !== "GET")
        return false;
      var accept = (request.headers.accept || "").split(/\s*,\s*/);
      return accept.indexOf("text/event-stream") >= 0;
    };
    var instance = {
      DEFAULT_PING: 10,
      DEFAULT_RETRY: 5,
      _write: function(chunk) {
        if (!this.writable)
          return false;
        try {
          return this._stream.write(chunk, "utf8");
        } catch (e) {
          return false;
        }
      },
      _open: function() {
        if (this.readyState !== API.CONNECTING)
          return;
        this.readyState = API.OPEN;
        var event = new Event("open");
        event.initEvent("open", false, false);
        this.dispatchEvent(event);
      },
      write: function(message) {
        return this.send(message);
      },
      end: function(message) {
        if (message !== void 0)
          this.write(message);
        this.close();
      },
      send: function(message, options2) {
        if (this.readyState > API.OPEN)
          return false;
        message = String(message).replace(/(\r\n|\r|\n)/g, "$1data: ");
        options2 = options2 || {};
        var frame = "";
        if (options2.event)
          frame += "event: " + options2.event + "\r\n";
        if (options2.id)
          frame += "id: " + options2.id + "\r\n";
        frame += "data: " + message + "\r\n\r\n";
        return this._write(frame);
      },
      ping: function() {
        return this._write(":\r\n\r\n");
      },
      close: function() {
        if (this.readyState > API.OPEN)
          return false;
        this.readyState = API.CLOSED;
        this.writable = false;
        if (this._pingTimer)
          clearInterval(this._pingTimer);
        if (this._stream)
          this._stream.end();
        var event = new Event("close");
        event.initEvent("close", false, false);
        this.dispatchEvent(event);
        return true;
      }
    };
    for (method in instance)
      EventSource.prototype[method] = instance[method];
    var method;
    for (key in EventTarget)
      EventSource.prototype[key] = EventTarget[key];
    var key;
    module2.exports = EventSource;
  }
});

// node_modules/faye-websocket/lib/faye/websocket.js
var require_websocket = __commonJS({
  "node_modules/faye-websocket/lib/faye/websocket.js"(exports, module2) {
    init_shims();
    "use strict";
    var util = require("util");
    var driver = require_driver();
    var API = require_api();
    var WebSocket2 = function(request, socket, body, protocols, options2) {
      options2 = options2 || {};
      this._stream = socket;
      this._driver = driver.http(request, { maxLength: options2.maxLength, protocols });
      var self2 = this;
      if (!this._stream || !this._stream.writable)
        return;
      if (!this._stream.readable)
        return this._stream.end();
      var catchup = function() {
        self2._stream.removeListener("data", catchup);
      };
      this._stream.on("data", catchup);
      API.call(this, options2);
      process.nextTick(function() {
        self2._driver.start();
        self2._driver.io.write(body);
      });
    };
    util.inherits(WebSocket2, API);
    WebSocket2.isWebSocket = function(request) {
      return driver.isWebSocket(request);
    };
    WebSocket2.validateOptions = function(options2, validKeys) {
      driver.validateOptions(options2, validKeys);
    };
    WebSocket2.WebSocket = WebSocket2;
    WebSocket2.Client = require_client2();
    WebSocket2.EventSource = require_eventsource();
    module2.exports = WebSocket2;
  }
});

// node_modules/@firebase/database/dist/index.node.cjs.js
var require_index_node_cjs3 = __commonJS({
  "node_modules/@firebase/database/dist/index.node.cjs.js"(exports, module2) {
    init_shims();
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var component = require_index_cjs();
    var util = require_index_node_cjs();
    var fayeWebsocket = require_websocket();
    var tslib = require_tslib();
    var logger$1 = require_index_cjs2();
    var name = "@firebase/database";
    var version = "0.10.9";
    var SDK_VERSION = "";
    function setSDKVersion(version2) {
      SDK_VERSION = version2;
    }
    var DOMStorageWrapper = function() {
      function DOMStorageWrapper2(domStorage_) {
        this.domStorage_ = domStorage_;
        this.prefix_ = "firebase:";
      }
      DOMStorageWrapper2.prototype.set = function(key, value) {
        if (value == null) {
          this.domStorage_.removeItem(this.prefixedName_(key));
        } else {
          this.domStorage_.setItem(this.prefixedName_(key), util.stringify(value));
        }
      };
      DOMStorageWrapper2.prototype.get = function(key) {
        var storedVal = this.domStorage_.getItem(this.prefixedName_(key));
        if (storedVal == null) {
          return null;
        } else {
          return util.jsonEval(storedVal);
        }
      };
      DOMStorageWrapper2.prototype.remove = function(key) {
        this.domStorage_.removeItem(this.prefixedName_(key));
      };
      DOMStorageWrapper2.prototype.prefixedName_ = function(name2) {
        return this.prefix_ + name2;
      };
      DOMStorageWrapper2.prototype.toString = function() {
        return this.domStorage_.toString();
      };
      return DOMStorageWrapper2;
    }();
    var MemoryStorage = function() {
      function MemoryStorage2() {
        this.cache_ = {};
        this.isInMemoryStorage = true;
      }
      MemoryStorage2.prototype.set = function(key, value) {
        if (value == null) {
          delete this.cache_[key];
        } else {
          this.cache_[key] = value;
        }
      };
      MemoryStorage2.prototype.get = function(key) {
        if (util.contains(this.cache_, key)) {
          return this.cache_[key];
        }
        return null;
      };
      MemoryStorage2.prototype.remove = function(key) {
        delete this.cache_[key];
      };
      return MemoryStorage2;
    }();
    var createStoragefor = function(domStorageName) {
      try {
        if (typeof window !== "undefined" && typeof window[domStorageName] !== "undefined") {
          var domStorage = window[domStorageName];
          domStorage.setItem("firebase:sentinel", "cache");
          domStorage.removeItem("firebase:sentinel");
          return new DOMStorageWrapper(domStorage);
        }
      } catch (e) {
      }
      return new MemoryStorage();
    };
    var PersistentStorage = createStoragefor("localStorage");
    var SessionStorage = createStoragefor("sessionStorage");
    var logClient = new logger$1.Logger("@firebase/database");
    var LUIDGenerator = function() {
      var id = 1;
      return function() {
        return id++;
      };
    }();
    var sha1 = function(str) {
      var utf8Bytes = util.stringToByteArray(str);
      var sha12 = new util.Sha1();
      sha12.update(utf8Bytes);
      var sha1Bytes = sha12.digest();
      return util.base64.encodeByteArray(sha1Bytes);
    };
    var buildLogMessage_ = function() {
      var varArgs = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        varArgs[_i] = arguments[_i];
      }
      var message = "";
      for (var i = 0; i < varArgs.length; i++) {
        var arg = varArgs[i];
        if (Array.isArray(arg) || arg && typeof arg === "object" && typeof arg.length === "number") {
          message += buildLogMessage_.apply(null, arg);
        } else if (typeof arg === "object") {
          message += util.stringify(arg);
        } else {
          message += arg;
        }
        message += " ";
      }
      return message;
    };
    var logger = null;
    var firstLog_ = true;
    var enableLogging$1 = function(logger_, persistent) {
      util.assert(!persistent || logger_ === true || logger_ === false, "Can't turn on custom loggers persistently.");
      if (logger_ === true) {
        logClient.logLevel = logger$1.LogLevel.VERBOSE;
        logger = logClient.log.bind(logClient);
        if (persistent) {
          SessionStorage.set("logging_enabled", true);
        }
      } else if (typeof logger_ === "function") {
        logger = logger_;
      } else {
        logger = null;
        SessionStorage.remove("logging_enabled");
      }
    };
    var log = function() {
      var varArgs = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        varArgs[_i] = arguments[_i];
      }
      if (firstLog_ === true) {
        firstLog_ = false;
        if (logger === null && SessionStorage.get("logging_enabled") === true) {
          enableLogging$1(true);
        }
      }
      if (logger) {
        var message = buildLogMessage_.apply(null, varArgs);
        logger(message);
      }
    };
    var logWrapper = function(prefix) {
      return function() {
        var varArgs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          varArgs[_i] = arguments[_i];
        }
        log.apply(void 0, tslib.__spreadArray([prefix], tslib.__read(varArgs)));
      };
    };
    var error3 = function() {
      var varArgs = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        varArgs[_i] = arguments[_i];
      }
      var message = "FIREBASE INTERNAL ERROR: " + buildLogMessage_.apply(void 0, tslib.__spreadArray([], tslib.__read(varArgs)));
      logClient.error(message);
    };
    var fatal = function() {
      var varArgs = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        varArgs[_i] = arguments[_i];
      }
      var message = "FIREBASE FATAL ERROR: " + buildLogMessage_.apply(void 0, tslib.__spreadArray([], tslib.__read(varArgs)));
      logClient.error(message);
      throw new Error(message);
    };
    var warn = function() {
      var varArgs = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        varArgs[_i] = arguments[_i];
      }
      var message = "FIREBASE WARNING: " + buildLogMessage_.apply(void 0, tslib.__spreadArray([], tslib.__read(varArgs)));
      logClient.warn(message);
    };
    var warnIfPageIsSecure = function() {
      if (typeof window !== "undefined" && window.location && window.location.protocol && window.location.protocol.indexOf("https:") !== -1) {
        warn("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().");
      }
    };
    var isInvalidJSONNumber = function(data) {
      return typeof data === "number" && (data !== data || data === Number.POSITIVE_INFINITY || data === Number.NEGATIVE_INFINITY);
    };
    var executeWhenDOMReady = function(fn) {
      if (util.isNodeSdk() || document.readyState === "complete") {
        fn();
      } else {
        var called_1 = false;
        var wrappedFn_1 = function() {
          if (!document.body) {
            setTimeout(wrappedFn_1, Math.floor(10));
            return;
          }
          if (!called_1) {
            called_1 = true;
            fn();
          }
        };
        if (document.addEventListener) {
          document.addEventListener("DOMContentLoaded", wrappedFn_1, false);
          window.addEventListener("load", wrappedFn_1, false);
        } else if (document.attachEvent) {
          document.attachEvent("onreadystatechange", function() {
            if (document.readyState === "complete") {
              wrappedFn_1();
            }
          });
          window.attachEvent("onload", wrappedFn_1);
        }
      }
    };
    var MIN_NAME = "[MIN_NAME]";
    var MAX_NAME = "[MAX_NAME]";
    var nameCompare = function(a, b) {
      if (a === b) {
        return 0;
      } else if (a === MIN_NAME || b === MAX_NAME) {
        return -1;
      } else if (b === MIN_NAME || a === MAX_NAME) {
        return 1;
      } else {
        var aAsInt = tryParseInt(a), bAsInt = tryParseInt(b);
        if (aAsInt !== null) {
          if (bAsInt !== null) {
            return aAsInt - bAsInt === 0 ? a.length - b.length : aAsInt - bAsInt;
          } else {
            return -1;
          }
        } else if (bAsInt !== null) {
          return 1;
        } else {
          return a < b ? -1 : 1;
        }
      }
    };
    var stringCompare = function(a, b) {
      if (a === b) {
        return 0;
      } else if (a < b) {
        return -1;
      } else {
        return 1;
      }
    };
    var requireKey = function(key, obj) {
      if (obj && key in obj) {
        return obj[key];
      } else {
        throw new Error("Missing required key (" + key + ") in object: " + util.stringify(obj));
      }
    };
    var ObjectToUniqueKey = function(obj) {
      if (typeof obj !== "object" || obj === null) {
        return util.stringify(obj);
      }
      var keys = [];
      for (var k in obj) {
        keys.push(k);
      }
      keys.sort();
      var key = "{";
      for (var i = 0; i < keys.length; i++) {
        if (i !== 0) {
          key += ",";
        }
        key += util.stringify(keys[i]);
        key += ":";
        key += ObjectToUniqueKey(obj[keys[i]]);
      }
      key += "}";
      return key;
    };
    var splitStringBySize = function(str, segsize) {
      var len = str.length;
      if (len <= segsize) {
        return [str];
      }
      var dataSegs = [];
      for (var c = 0; c < len; c += segsize) {
        if (c + segsize > len) {
          dataSegs.push(str.substring(c, len));
        } else {
          dataSegs.push(str.substring(c, c + segsize));
        }
      }
      return dataSegs;
    };
    function each(obj, fn) {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          fn(key, obj[key]);
        }
      }
    }
    var doubleToIEEE754String = function(v) {
      util.assert(!isInvalidJSONNumber(v), "Invalid JSON number");
      var ebits = 11, fbits = 52;
      var bias = (1 << ebits - 1) - 1;
      var s2, e, f, ln, i;
      if (v === 0) {
        e = 0;
        f = 0;
        s2 = 1 / v === -Infinity ? 1 : 0;
      } else {
        s2 = v < 0;
        v = Math.abs(v);
        if (v >= Math.pow(2, 1 - bias)) {
          ln = Math.min(Math.floor(Math.log(v) / Math.LN2), bias);
          e = ln + bias;
          f = Math.round(v * Math.pow(2, fbits - ln) - Math.pow(2, fbits));
        } else {
          e = 0;
          f = Math.round(v / Math.pow(2, 1 - bias - fbits));
        }
      }
      var bits = [];
      for (i = fbits; i; i -= 1) {
        bits.push(f % 2 ? 1 : 0);
        f = Math.floor(f / 2);
      }
      for (i = ebits; i; i -= 1) {
        bits.push(e % 2 ? 1 : 0);
        e = Math.floor(e / 2);
      }
      bits.push(s2 ? 1 : 0);
      bits.reverse();
      var str = bits.join("");
      var hexByteString = "";
      for (i = 0; i < 64; i += 8) {
        var hexByte = parseInt(str.substr(i, 8), 2).toString(16);
        if (hexByte.length === 1) {
          hexByte = "0" + hexByte;
        }
        hexByteString = hexByteString + hexByte;
      }
      return hexByteString.toLowerCase();
    };
    var isChromeExtensionContentScript = function() {
      return !!(typeof window === "object" && window["chrome"] && window["chrome"]["extension"] && !/^chrome/.test(window.location.href));
    };
    var isWindowsStoreApp = function() {
      return typeof Windows === "object" && typeof Windows.UI === "object";
    };
    function errorForServerCode(code, query2) {
      var reason = "Unknown Error";
      if (code === "too_big") {
        reason = "The data requested exceeds the maximum size that can be accessed with a single request.";
      } else if (code === "permission_denied") {
        reason = "Client doesn't have permission to access the desired data.";
      } else if (code === "unavailable") {
        reason = "The service is unavailable";
      }
      var error4 = new Error(code + " at " + query2._path.toString() + ": " + reason);
      error4.code = code.toUpperCase();
      return error4;
    }
    var INTEGER_REGEXP_ = new RegExp("^-?(0*)\\d{1,10}$");
    var INTEGER_32_MIN = -2147483648;
    var INTEGER_32_MAX = 2147483647;
    var tryParseInt = function(str) {
      if (INTEGER_REGEXP_.test(str)) {
        var intVal = Number(str);
        if (intVal >= INTEGER_32_MIN && intVal <= INTEGER_32_MAX) {
          return intVal;
        }
      }
      return null;
    };
    var exceptionGuard = function(fn) {
      try {
        fn();
      } catch (e) {
        setTimeout(function() {
          var stack = e.stack || "";
          warn("Exception was thrown by user callback.", stack);
          throw e;
        }, Math.floor(0));
      }
    };
    var beingCrawled = function() {
      var userAgent = typeof window === "object" && window["navigator"] && window["navigator"]["userAgent"] || "";
      return userAgent.search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i) >= 0;
    };
    var setTimeoutNonBlocking = function(fn, time) {
      var timeout = setTimeout(fn, time);
      if (typeof timeout === "object" && timeout["unref"]) {
        timeout["unref"]();
      }
      return timeout;
    };
    var AppCheckTokenProvider = function() {
      function AppCheckTokenProvider2(appName_, appCheckProvider) {
        var _this = this;
        this.appName_ = appName_;
        this.appCheckProvider = appCheckProvider;
        this.appCheck = appCheckProvider === null || appCheckProvider === void 0 ? void 0 : appCheckProvider.getImmediate({ optional: true });
        if (!this.appCheck) {
          appCheckProvider === null || appCheckProvider === void 0 ? void 0 : appCheckProvider.get().then(function(appCheck) {
            return _this.appCheck = appCheck;
          });
        }
      }
      AppCheckTokenProvider2.prototype.getToken = function(forceRefresh) {
        var _this = this;
        if (!this.appCheck) {
          return new Promise(function(resolve2, reject) {
            setTimeout(function() {
              if (_this.appCheck) {
                _this.getToken(forceRefresh).then(resolve2, reject);
              } else {
                resolve2(null);
              }
            }, 0);
          });
        }
        return this.appCheck.getToken(forceRefresh);
      };
      AppCheckTokenProvider2.prototype.addTokenChangeListener = function(listener) {
        var _a;
        (_a = this.appCheckProvider) === null || _a === void 0 ? void 0 : _a.get().then(function(appCheck) {
          return appCheck.addTokenListener(listener);
        });
      };
      AppCheckTokenProvider2.prototype.notifyForInvalidToken = function() {
        warn('Provided AppCheck credentials for the app named "' + this.appName_ + '" are invalid. This usually indicates your app was not initialized correctly.');
      };
      return AppCheckTokenProvider2;
    }();
    var FirebaseAuthTokenProvider = function() {
      function FirebaseAuthTokenProvider2(appName_, firebaseOptions_, authProvider_) {
        var _this = this;
        this.appName_ = appName_;
        this.firebaseOptions_ = firebaseOptions_;
        this.authProvider_ = authProvider_;
        this.auth_ = null;
        this.auth_ = authProvider_.getImmediate({ optional: true });
        if (!this.auth_) {
          authProvider_.onInit(function(auth) {
            return _this.auth_ = auth;
          });
        }
      }
      FirebaseAuthTokenProvider2.prototype.getToken = function(forceRefresh) {
        var _this = this;
        if (!this.auth_) {
          return new Promise(function(resolve2, reject) {
            setTimeout(function() {
              if (_this.auth_) {
                _this.getToken(forceRefresh).then(resolve2, reject);
              } else {
                resolve2(null);
              }
            }, 0);
          });
        }
        return this.auth_.getToken(forceRefresh).catch(function(error4) {
          if (error4 && error4.code === "auth/token-not-initialized") {
            log("Got auth/token-not-initialized error.  Treating as null token.");
            return null;
          } else {
            return Promise.reject(error4);
          }
        });
      };
      FirebaseAuthTokenProvider2.prototype.addTokenChangeListener = function(listener) {
        if (this.auth_) {
          this.auth_.addAuthTokenListener(listener);
        } else {
          this.authProvider_.get().then(function(auth) {
            return auth.addAuthTokenListener(listener);
          });
        }
      };
      FirebaseAuthTokenProvider2.prototype.removeTokenChangeListener = function(listener) {
        this.authProvider_.get().then(function(auth) {
          return auth.removeAuthTokenListener(listener);
        });
      };
      FirebaseAuthTokenProvider2.prototype.notifyForInvalidToken = function() {
        var errorMessage = 'Provided authentication credentials for the app named "' + this.appName_ + '" are invalid. This usually indicates your app was not initialized correctly. ';
        if ("credential" in this.firebaseOptions_) {
          errorMessage += 'Make sure the "credential" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.';
        } else if ("serviceAccount" in this.firebaseOptions_) {
          errorMessage += 'Make sure the "serviceAccount" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.';
        } else {
          errorMessage += 'Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/.';
        }
        warn(errorMessage);
      };
      return FirebaseAuthTokenProvider2;
    }();
    var EmulatorTokenProvider = function() {
      function EmulatorTokenProvider2(accessToken) {
        this.accessToken = accessToken;
      }
      EmulatorTokenProvider2.prototype.getToken = function(forceRefresh) {
        return Promise.resolve({
          accessToken: this.accessToken
        });
      };
      EmulatorTokenProvider2.prototype.addTokenChangeListener = function(listener) {
        listener(this.accessToken);
      };
      EmulatorTokenProvider2.prototype.removeTokenChangeListener = function(listener) {
      };
      EmulatorTokenProvider2.prototype.notifyForInvalidToken = function() {
      };
      EmulatorTokenProvider2.OWNER = "owner";
      return EmulatorTokenProvider2;
    }();
    var PROTOCOL_VERSION = "5";
    var VERSION_PARAM = "v";
    var TRANSPORT_SESSION_PARAM = "s";
    var REFERER_PARAM = "r";
    var FORGE_REF = "f";
    var FORGE_DOMAIN_RE = /(console\.firebase|firebase-console-\w+\.corp|firebase\.corp)\.google\.com/;
    var LAST_SESSION_PARAM = "ls";
    var APPLICATION_ID_PARAM = "p";
    var APP_CHECK_TOKEN_PARAM = "ac";
    var WEBSOCKET = "websocket";
    var LONG_POLLING = "long_polling";
    var RepoInfo = function() {
      function RepoInfo2(host, secure, namespace, webSocketOnly, nodeAdmin, persistenceKey, includeNamespaceInQueryParams) {
        if (nodeAdmin === void 0) {
          nodeAdmin = false;
        }
        if (persistenceKey === void 0) {
          persistenceKey = "";
        }
        if (includeNamespaceInQueryParams === void 0) {
          includeNamespaceInQueryParams = false;
        }
        this.secure = secure;
        this.namespace = namespace;
        this.webSocketOnly = webSocketOnly;
        this.nodeAdmin = nodeAdmin;
        this.persistenceKey = persistenceKey;
        this.includeNamespaceInQueryParams = includeNamespaceInQueryParams;
        this._host = host.toLowerCase();
        this._domain = this._host.substr(this._host.indexOf(".") + 1);
        this.internalHost = PersistentStorage.get("host:" + host) || this._host;
      }
      RepoInfo2.prototype.isCacheableHost = function() {
        return this.internalHost.substr(0, 2) === "s-";
      };
      RepoInfo2.prototype.isCustomHost = function() {
        return this._domain !== "firebaseio.com" && this._domain !== "firebaseio-demo.com";
      };
      Object.defineProperty(RepoInfo2.prototype, "host", {
        get: function() {
          return this._host;
        },
        set: function(newHost) {
          if (newHost !== this.internalHost) {
            this.internalHost = newHost;
            if (this.isCacheableHost()) {
              PersistentStorage.set("host:" + this._host, this.internalHost);
            }
          }
        },
        enumerable: false,
        configurable: true
      });
      RepoInfo2.prototype.toString = function() {
        var str = this.toURLString();
        if (this.persistenceKey) {
          str += "<" + this.persistenceKey + ">";
        }
        return str;
      };
      RepoInfo2.prototype.toURLString = function() {
        var protocol = this.secure ? "https://" : "http://";
        var query2 = this.includeNamespaceInQueryParams ? "?ns=" + this.namespace : "";
        return "" + protocol + this.host + "/" + query2;
      };
      return RepoInfo2;
    }();
    function repoInfoNeedsQueryParam(repoInfo) {
      return repoInfo.host !== repoInfo.internalHost || repoInfo.isCustomHost() || repoInfo.includeNamespaceInQueryParams;
    }
    function repoInfoConnectionURL(repoInfo, type, params) {
      util.assert(typeof type === "string", "typeof type must == string");
      util.assert(typeof params === "object", "typeof params must == object");
      var connURL;
      if (type === WEBSOCKET) {
        connURL = (repoInfo.secure ? "wss://" : "ws://") + repoInfo.internalHost + "/.ws?";
      } else if (type === LONG_POLLING) {
        connURL = (repoInfo.secure ? "https://" : "http://") + repoInfo.internalHost + "/.lp?";
      } else {
        throw new Error("Unknown connection type: " + type);
      }
      if (repoInfoNeedsQueryParam(repoInfo)) {
        params["ns"] = repoInfo.namespace;
      }
      var pairs = [];
      each(params, function(key, value) {
        pairs.push(key + "=" + value);
      });
      return connURL + pairs.join("&");
    }
    var StatsCollection = function() {
      function StatsCollection2() {
        this.counters_ = {};
      }
      StatsCollection2.prototype.incrementCounter = function(name2, amount) {
        if (amount === void 0) {
          amount = 1;
        }
        if (!util.contains(this.counters_, name2)) {
          this.counters_[name2] = 0;
        }
        this.counters_[name2] += amount;
      };
      StatsCollection2.prototype.get = function() {
        return util.deepCopy(this.counters_);
      };
      return StatsCollection2;
    }();
    var collections = {};
    var reporters = {};
    function statsManagerGetCollection(repoInfo) {
      var hashString = repoInfo.toString();
      if (!collections[hashString]) {
        collections[hashString] = new StatsCollection();
      }
      return collections[hashString];
    }
    function statsManagerGetOrCreateReporter(repoInfo, creatorFunction) {
      var hashString = repoInfo.toString();
      if (!reporters[hashString]) {
        reporters[hashString] = creatorFunction();
      }
      return reporters[hashString];
    }
    var PacketReceiver = function() {
      function PacketReceiver2(onMessage_) {
        this.onMessage_ = onMessage_;
        this.pendingResponses = [];
        this.currentResponseNum = 0;
        this.closeAfterResponse = -1;
        this.onClose = null;
      }
      PacketReceiver2.prototype.closeAfter = function(responseNum, callback) {
        this.closeAfterResponse = responseNum;
        this.onClose = callback;
        if (this.closeAfterResponse < this.currentResponseNum) {
          this.onClose();
          this.onClose = null;
        }
      };
      PacketReceiver2.prototype.handleResponse = function(requestNum, data) {
        var _this = this;
        this.pendingResponses[requestNum] = data;
        var _loop_1 = function() {
          var toProcess = this_1.pendingResponses[this_1.currentResponseNum];
          delete this_1.pendingResponses[this_1.currentResponseNum];
          var _loop_2 = function(i2) {
            if (toProcess[i2]) {
              exceptionGuard(function() {
                _this.onMessage_(toProcess[i2]);
              });
            }
          };
          for (var i = 0; i < toProcess.length; ++i) {
            _loop_2(i);
          }
          if (this_1.currentResponseNum === this_1.closeAfterResponse) {
            if (this_1.onClose) {
              this_1.onClose();
              this_1.onClose = null;
            }
            return "break";
          }
          this_1.currentResponseNum++;
        };
        var this_1 = this;
        while (this.pendingResponses[this.currentResponseNum]) {
          var state_1 = _loop_1();
          if (state_1 === "break")
            break;
        }
      };
      return PacketReceiver2;
    }();
    var FIREBASE_LONGPOLL_START_PARAM = "start";
    var FIREBASE_LONGPOLL_CLOSE_COMMAND = "close";
    var FIREBASE_LONGPOLL_COMMAND_CB_NAME = "pLPCommand";
    var FIREBASE_LONGPOLL_DATA_CB_NAME = "pRTLPCB";
    var FIREBASE_LONGPOLL_ID_PARAM = "id";
    var FIREBASE_LONGPOLL_PW_PARAM = "pw";
    var FIREBASE_LONGPOLL_SERIAL_PARAM = "ser";
    var FIREBASE_LONGPOLL_CALLBACK_ID_PARAM = "cb";
    var FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM = "seg";
    var FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET = "ts";
    var FIREBASE_LONGPOLL_DATA_PARAM = "d";
    var FIREBASE_LONGPOLL_DISCONN_FRAME_REQUEST_PARAM = "dframe";
    var MAX_URL_DATA_SIZE = 1870;
    var SEG_HEADER_SIZE = 30;
    var MAX_PAYLOAD_SIZE = MAX_URL_DATA_SIZE - SEG_HEADER_SIZE;
    var KEEPALIVE_REQUEST_INTERVAL = 25e3;
    var LP_CONNECT_TIMEOUT = 3e4;
    var BrowserPollConnection = function() {
      function BrowserPollConnection2(connId, repoInfo, applicationId, appCheckToken, authToken, transportSessionId, lastSessionId) {
        var _this = this;
        this.connId = connId;
        this.repoInfo = repoInfo;
        this.applicationId = applicationId;
        this.appCheckToken = appCheckToken;
        this.authToken = authToken;
        this.transportSessionId = transportSessionId;
        this.lastSessionId = lastSessionId;
        this.bytesSent = 0;
        this.bytesReceived = 0;
        this.everConnected_ = false;
        this.log_ = logWrapper(connId);
        this.stats_ = statsManagerGetCollection(repoInfo);
        this.urlFn = function(params) {
          if (_this.appCheckToken) {
            params[APP_CHECK_TOKEN_PARAM] = _this.appCheckToken;
          }
          return repoInfoConnectionURL(repoInfo, LONG_POLLING, params);
        };
      }
      BrowserPollConnection2.prototype.open = function(onMessage, onDisconnect) {
        var _this = this;
        this.curSegmentNum = 0;
        this.onDisconnect_ = onDisconnect;
        this.myPacketOrderer = new PacketReceiver(onMessage);
        this.isClosed_ = false;
        this.connectTimeoutTimer_ = setTimeout(function() {
          _this.log_("Timed out trying to connect.");
          _this.onClosed_();
          _this.connectTimeoutTimer_ = null;
        }, Math.floor(LP_CONNECT_TIMEOUT));
        executeWhenDOMReady(function() {
          if (_this.isClosed_) {
            return;
          }
          _this.scriptTagHolder = new FirebaseIFrameScriptHolder(function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var _a = tslib.__read(args, 5), command = _a[0], arg1 = _a[1], arg2 = _a[2];
            _a[3];
            _a[4];
            _this.incrementIncomingBytes_(args);
            if (!_this.scriptTagHolder) {
              return;
            }
            if (_this.connectTimeoutTimer_) {
              clearTimeout(_this.connectTimeoutTimer_);
              _this.connectTimeoutTimer_ = null;
            }
            _this.everConnected_ = true;
            if (command === FIREBASE_LONGPOLL_START_PARAM) {
              _this.id = arg1;
              _this.password = arg2;
            } else if (command === FIREBASE_LONGPOLL_CLOSE_COMMAND) {
              if (arg1) {
                _this.scriptTagHolder.sendNewPolls = false;
                _this.myPacketOrderer.closeAfter(arg1, function() {
                  _this.onClosed_();
                });
              } else {
                _this.onClosed_();
              }
            } else {
              throw new Error("Unrecognized command received: " + command);
            }
          }, function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var _a = tslib.__read(args, 2), pN = _a[0], data = _a[1];
            _this.incrementIncomingBytes_(args);
            _this.myPacketOrderer.handleResponse(pN, data);
          }, function() {
            _this.onClosed_();
          }, _this.urlFn);
          var urlParams = {};
          urlParams[FIREBASE_LONGPOLL_START_PARAM] = "t";
          urlParams[FIREBASE_LONGPOLL_SERIAL_PARAM] = Math.floor(Math.random() * 1e8);
          if (_this.scriptTagHolder.uniqueCallbackIdentifier) {
            urlParams[FIREBASE_LONGPOLL_CALLBACK_ID_PARAM] = _this.scriptTagHolder.uniqueCallbackIdentifier;
          }
          urlParams[VERSION_PARAM] = PROTOCOL_VERSION;
          if (_this.transportSessionId) {
            urlParams[TRANSPORT_SESSION_PARAM] = _this.transportSessionId;
          }
          if (_this.lastSessionId) {
            urlParams[LAST_SESSION_PARAM] = _this.lastSessionId;
          }
          if (_this.applicationId) {
            urlParams[APPLICATION_ID_PARAM] = _this.applicationId;
          }
          if (_this.appCheckToken) {
            urlParams[APP_CHECK_TOKEN_PARAM] = _this.appCheckToken;
          }
          if (typeof location !== "undefined" && location.hostname && FORGE_DOMAIN_RE.test(location.hostname)) {
            urlParams[REFERER_PARAM] = FORGE_REF;
          }
          var connectURL = _this.urlFn(urlParams);
          _this.log_("Connecting via long-poll to " + connectURL);
          _this.scriptTagHolder.addTag(connectURL, function() {
          });
        });
      };
      BrowserPollConnection2.prototype.start = function() {
        this.scriptTagHolder.startLongPoll(this.id, this.password);
        this.addDisconnectPingFrame(this.id, this.password);
      };
      BrowserPollConnection2.forceAllow = function() {
        BrowserPollConnection2.forceAllow_ = true;
      };
      BrowserPollConnection2.forceDisallow = function() {
        BrowserPollConnection2.forceDisallow_ = true;
      };
      BrowserPollConnection2.isAvailable = function() {
        if (util.isNodeSdk()) {
          return false;
        } else if (BrowserPollConnection2.forceAllow_) {
          return true;
        } else {
          return !BrowserPollConnection2.forceDisallow_ && typeof document !== "undefined" && document.createElement != null && !isChromeExtensionContentScript() && !isWindowsStoreApp();
        }
      };
      BrowserPollConnection2.prototype.markConnectionHealthy = function() {
      };
      BrowserPollConnection2.prototype.shutdown_ = function() {
        this.isClosed_ = true;
        if (this.scriptTagHolder) {
          this.scriptTagHolder.close();
          this.scriptTagHolder = null;
        }
        if (this.myDisconnFrame) {
          document.body.removeChild(this.myDisconnFrame);
          this.myDisconnFrame = null;
        }
        if (this.connectTimeoutTimer_) {
          clearTimeout(this.connectTimeoutTimer_);
          this.connectTimeoutTimer_ = null;
        }
      };
      BrowserPollConnection2.prototype.onClosed_ = function() {
        if (!this.isClosed_) {
          this.log_("Longpoll is closing itself");
          this.shutdown_();
          if (this.onDisconnect_) {
            this.onDisconnect_(this.everConnected_);
            this.onDisconnect_ = null;
          }
        }
      };
      BrowserPollConnection2.prototype.close = function() {
        if (!this.isClosed_) {
          this.log_("Longpoll is being closed.");
          this.shutdown_();
        }
      };
      BrowserPollConnection2.prototype.send = function(data) {
        var dataStr = util.stringify(data);
        this.bytesSent += dataStr.length;
        this.stats_.incrementCounter("bytes_sent", dataStr.length);
        var base64data = util.base64Encode(dataStr);
        var dataSegs = splitStringBySize(base64data, MAX_PAYLOAD_SIZE);
        for (var i = 0; i < dataSegs.length; i++) {
          this.scriptTagHolder.enqueueSegment(this.curSegmentNum, dataSegs.length, dataSegs[i]);
          this.curSegmentNum++;
        }
      };
      BrowserPollConnection2.prototype.addDisconnectPingFrame = function(id, pw) {
        if (util.isNodeSdk()) {
          return;
        }
        this.myDisconnFrame = document.createElement("iframe");
        var urlParams = {};
        urlParams[FIREBASE_LONGPOLL_DISCONN_FRAME_REQUEST_PARAM] = "t";
        urlParams[FIREBASE_LONGPOLL_ID_PARAM] = id;
        urlParams[FIREBASE_LONGPOLL_PW_PARAM] = pw;
        this.myDisconnFrame.src = this.urlFn(urlParams);
        this.myDisconnFrame.style.display = "none";
        document.body.appendChild(this.myDisconnFrame);
      };
      BrowserPollConnection2.prototype.incrementIncomingBytes_ = function(args) {
        var bytesReceived = util.stringify(args).length;
        this.bytesReceived += bytesReceived;
        this.stats_.incrementCounter("bytes_received", bytesReceived);
      };
      return BrowserPollConnection2;
    }();
    var FirebaseIFrameScriptHolder = function() {
      function FirebaseIFrameScriptHolder2(commandCB, onMessageCB, onDisconnect, urlFn) {
        this.onDisconnect = onDisconnect;
        this.urlFn = urlFn;
        this.outstandingRequests = new Set();
        this.pendingSegs = [];
        this.currentSerial = Math.floor(Math.random() * 1e8);
        this.sendNewPolls = true;
        if (!util.isNodeSdk()) {
          this.uniqueCallbackIdentifier = LUIDGenerator();
          window[FIREBASE_LONGPOLL_COMMAND_CB_NAME + this.uniqueCallbackIdentifier] = commandCB;
          window[FIREBASE_LONGPOLL_DATA_CB_NAME + this.uniqueCallbackIdentifier] = onMessageCB;
          this.myIFrame = FirebaseIFrameScriptHolder2.createIFrame_();
          var script = "";
          if (this.myIFrame.src && this.myIFrame.src.substr(0, "javascript:".length) === "javascript:") {
            var currentDomain = document.domain;
            script = '<script>document.domain="' + currentDomain + '";<\/script>';
          }
          var iframeContents = "<html><body>" + script + "</body></html>";
          try {
            this.myIFrame.doc.open();
            this.myIFrame.doc.write(iframeContents);
            this.myIFrame.doc.close();
          } catch (e) {
            log("frame writing exception");
            if (e.stack) {
              log(e.stack);
            }
            log(e);
          }
        } else {
          this.commandCB = commandCB;
          this.onMessageCB = onMessageCB;
        }
      }
      FirebaseIFrameScriptHolder2.createIFrame_ = function() {
        var iframe = document.createElement("iframe");
        iframe.style.display = "none";
        if (document.body) {
          document.body.appendChild(iframe);
          try {
            var a = iframe.contentWindow.document;
            if (!a) {
              log("No IE domain setting required");
            }
          } catch (e) {
            var domain = document.domain;
            iframe.src = "javascript:void((function(){document.open();document.domain='" + domain + "';document.close();})())";
          }
        } else {
          throw "Document body has not initialized. Wait to initialize Firebase until after the document is ready.";
        }
        if (iframe.contentDocument) {
          iframe.doc = iframe.contentDocument;
        } else if (iframe.contentWindow) {
          iframe.doc = iframe.contentWindow.document;
        } else if (iframe.document) {
          iframe.doc = iframe.document;
        }
        return iframe;
      };
      FirebaseIFrameScriptHolder2.prototype.close = function() {
        var _this = this;
        this.alive = false;
        if (this.myIFrame) {
          this.myIFrame.doc.body.innerHTML = "";
          setTimeout(function() {
            if (_this.myIFrame !== null) {
              document.body.removeChild(_this.myIFrame);
              _this.myIFrame = null;
            }
          }, Math.floor(0));
        }
        var onDisconnect = this.onDisconnect;
        if (onDisconnect) {
          this.onDisconnect = null;
          onDisconnect();
        }
      };
      FirebaseIFrameScriptHolder2.prototype.startLongPoll = function(id, pw) {
        this.myID = id;
        this.myPW = pw;
        this.alive = true;
        while (this.newRequest_()) {
        }
      };
      FirebaseIFrameScriptHolder2.prototype.newRequest_ = function() {
        if (this.alive && this.sendNewPolls && this.outstandingRequests.size < (this.pendingSegs.length > 0 ? 2 : 1)) {
          this.currentSerial++;
          var urlParams = {};
          urlParams[FIREBASE_LONGPOLL_ID_PARAM] = this.myID;
          urlParams[FIREBASE_LONGPOLL_PW_PARAM] = this.myPW;
          urlParams[FIREBASE_LONGPOLL_SERIAL_PARAM] = this.currentSerial;
          var theURL = this.urlFn(urlParams);
          var curDataString = "";
          var i = 0;
          while (this.pendingSegs.length > 0) {
            var nextSeg = this.pendingSegs[0];
            if (nextSeg.d.length + SEG_HEADER_SIZE + curDataString.length <= MAX_URL_DATA_SIZE) {
              var theSeg = this.pendingSegs.shift();
              curDataString = curDataString + "&" + FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM + i + "=" + theSeg.seg + "&" + FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET + i + "=" + theSeg.ts + "&" + FIREBASE_LONGPOLL_DATA_PARAM + i + "=" + theSeg.d;
              i++;
            } else {
              break;
            }
          }
          theURL = theURL + curDataString;
          this.addLongPollTag_(theURL, this.currentSerial);
          return true;
        } else {
          return false;
        }
      };
      FirebaseIFrameScriptHolder2.prototype.enqueueSegment = function(segnum, totalsegs, data) {
        this.pendingSegs.push({ seg: segnum, ts: totalsegs, d: data });
        if (this.alive) {
          this.newRequest_();
        }
      };
      FirebaseIFrameScriptHolder2.prototype.addLongPollTag_ = function(url, serial) {
        var _this = this;
        this.outstandingRequests.add(serial);
        var doNewRequest = function() {
          _this.outstandingRequests.delete(serial);
          _this.newRequest_();
        };
        var keepaliveTimeout = setTimeout(doNewRequest, Math.floor(KEEPALIVE_REQUEST_INTERVAL));
        var readyStateCB = function() {
          clearTimeout(keepaliveTimeout);
          doNewRequest();
        };
        this.addTag(url, readyStateCB);
      };
      FirebaseIFrameScriptHolder2.prototype.addTag = function(url, loadCB) {
        var _this = this;
        if (util.isNodeSdk()) {
          this.doNodeLongPoll(url, loadCB);
        } else {
          setTimeout(function() {
            try {
              if (!_this.sendNewPolls) {
                return;
              }
              var newScript_1 = _this.myIFrame.doc.createElement("script");
              newScript_1.type = "text/javascript";
              newScript_1.async = true;
              newScript_1.src = url;
              newScript_1.onload = newScript_1.onreadystatechange = function() {
                var rstate = newScript_1.readyState;
                if (!rstate || rstate === "loaded" || rstate === "complete") {
                  newScript_1.onload = newScript_1.onreadystatechange = null;
                  if (newScript_1.parentNode) {
                    newScript_1.parentNode.removeChild(newScript_1);
                  }
                  loadCB();
                }
              };
              newScript_1.onerror = function() {
                log("Long-poll script failed to load: " + url);
                _this.sendNewPolls = false;
                _this.close();
              };
              _this.myIFrame.doc.body.appendChild(newScript_1);
            } catch (e) {
            }
          }, Math.floor(1));
        }
      };
      return FirebaseIFrameScriptHolder2;
    }();
    var WEBSOCKET_MAX_FRAME_SIZE = 16384;
    var WEBSOCKET_KEEPALIVE_INTERVAL = 45e3;
    var WebSocketImpl = null;
    if (typeof MozWebSocket !== "undefined") {
      WebSocketImpl = MozWebSocket;
    } else if (typeof WebSocket !== "undefined") {
      WebSocketImpl = WebSocket;
    }
    function setWebSocketImpl(impl) {
      WebSocketImpl = impl;
    }
    var WebSocketConnection = function() {
      function WebSocketConnection2(connId, repoInfo, applicationId, appCheckToken, authToken, transportSessionId, lastSessionId) {
        this.connId = connId;
        this.applicationId = applicationId;
        this.appCheckToken = appCheckToken;
        this.authToken = authToken;
        this.keepaliveTimer = null;
        this.frames = null;
        this.totalFrames = 0;
        this.bytesSent = 0;
        this.bytesReceived = 0;
        this.log_ = logWrapper(this.connId);
        this.stats_ = statsManagerGetCollection(repoInfo);
        this.connURL = WebSocketConnection2.connectionURL_(repoInfo, transportSessionId, lastSessionId, appCheckToken);
        this.nodeAdmin = repoInfo.nodeAdmin;
      }
      WebSocketConnection2.connectionURL_ = function(repoInfo, transportSessionId, lastSessionId, appCheckToken) {
        var urlParams = {};
        urlParams[VERSION_PARAM] = PROTOCOL_VERSION;
        if (!util.isNodeSdk() && typeof location !== "undefined" && location.hostname && FORGE_DOMAIN_RE.test(location.hostname)) {
          urlParams[REFERER_PARAM] = FORGE_REF;
        }
        if (transportSessionId) {
          urlParams[TRANSPORT_SESSION_PARAM] = transportSessionId;
        }
        if (lastSessionId) {
          urlParams[LAST_SESSION_PARAM] = lastSessionId;
        }
        if (appCheckToken) {
          urlParams[APP_CHECK_TOKEN_PARAM] = appCheckToken;
        }
        return repoInfoConnectionURL(repoInfo, WEBSOCKET, urlParams);
      };
      WebSocketConnection2.prototype.open = function(onMessage, onDisconnect) {
        var _this = this;
        this.onDisconnect = onDisconnect;
        this.onMessage = onMessage;
        this.log_("Websocket connecting to " + this.connURL);
        this.everConnected_ = false;
        PersistentStorage.set("previous_websocket_failure", true);
        try {
          if (util.isNodeSdk()) {
            var device = this.nodeAdmin ? "AdminNode" : "Node";
            var options2 = {
              headers: {
                "User-Agent": "Firebase/" + PROTOCOL_VERSION + "/" + SDK_VERSION + "/" + process.platform + "/" + device,
                "X-Firebase-GMPID": this.applicationId || ""
              }
            };
            if (this.authToken) {
              options2.headers["Authorization"] = "Bearer " + this.authToken;
            }
            if (this.appCheckToken) {
              options2.headers["X-Firebase-AppCheck"] = this.appCheckToken;
            }
            var env = process["env"];
            var proxy = this.connURL.indexOf("wss://") === 0 ? env["HTTPS_PROXY"] || env["https_proxy"] : env["HTTP_PROXY"] || env["http_proxy"];
            if (proxy) {
              options2["proxy"] = { origin: proxy };
            }
            this.mySock = new WebSocketImpl(this.connURL, [], options2);
          } else {
            var options2 = {
              headers: {
                "X-Firebase-GMPID": this.applicationId || "",
                "X-Firebase-AppCheck": this.appCheckToken || ""
              }
            };
            this.mySock = new WebSocketImpl(this.connURL, [], options2);
          }
        } catch (e) {
          this.log_("Error instantiating WebSocket.");
          var error4 = e.message || e.data;
          if (error4) {
            this.log_(error4);
          }
          this.onClosed_();
          return;
        }
        this.mySock.onopen = function() {
          _this.log_("Websocket connected.");
          _this.everConnected_ = true;
        };
        this.mySock.onclose = function() {
          _this.log_("Websocket connection was disconnected.");
          _this.mySock = null;
          _this.onClosed_();
        };
        this.mySock.onmessage = function(m) {
          _this.handleIncomingFrame(m);
        };
        this.mySock.onerror = function(e) {
          _this.log_("WebSocket error.  Closing connection.");
          var error5 = e.message || e.data;
          if (error5) {
            _this.log_(error5);
          }
          _this.onClosed_();
        };
      };
      WebSocketConnection2.prototype.start = function() {
      };
      WebSocketConnection2.forceDisallow = function() {
        WebSocketConnection2.forceDisallow_ = true;
      };
      WebSocketConnection2.isAvailable = function() {
        var isOldAndroid = false;
        if (typeof navigator !== "undefined" && navigator.userAgent) {
          var oldAndroidRegex = /Android ([0-9]{0,}\.[0-9]{0,})/;
          var oldAndroidMatch = navigator.userAgent.match(oldAndroidRegex);
          if (oldAndroidMatch && oldAndroidMatch.length > 1) {
            if (parseFloat(oldAndroidMatch[1]) < 4.4) {
              isOldAndroid = true;
            }
          }
        }
        return !isOldAndroid && WebSocketImpl !== null && !WebSocketConnection2.forceDisallow_;
      };
      WebSocketConnection2.previouslyFailed = function() {
        return PersistentStorage.isInMemoryStorage || PersistentStorage.get("previous_websocket_failure") === true;
      };
      WebSocketConnection2.prototype.markConnectionHealthy = function() {
        PersistentStorage.remove("previous_websocket_failure");
      };
      WebSocketConnection2.prototype.appendFrame_ = function(data) {
        this.frames.push(data);
        if (this.frames.length === this.totalFrames) {
          var fullMess = this.frames.join("");
          this.frames = null;
          var jsonMess = util.jsonEval(fullMess);
          this.onMessage(jsonMess);
        }
      };
      WebSocketConnection2.prototype.handleNewFrameCount_ = function(frameCount) {
        this.totalFrames = frameCount;
        this.frames = [];
      };
      WebSocketConnection2.prototype.extractFrameCount_ = function(data) {
        util.assert(this.frames === null, "We already have a frame buffer");
        if (data.length <= 6) {
          var frameCount = Number(data);
          if (!isNaN(frameCount)) {
            this.handleNewFrameCount_(frameCount);
            return null;
          }
        }
        this.handleNewFrameCount_(1);
        return data;
      };
      WebSocketConnection2.prototype.handleIncomingFrame = function(mess) {
        if (this.mySock === null) {
          return;
        }
        var data = mess["data"];
        this.bytesReceived += data.length;
        this.stats_.incrementCounter("bytes_received", data.length);
        this.resetKeepAlive();
        if (this.frames !== null) {
          this.appendFrame_(data);
        } else {
          var remainingData = this.extractFrameCount_(data);
          if (remainingData !== null) {
            this.appendFrame_(remainingData);
          }
        }
      };
      WebSocketConnection2.prototype.send = function(data) {
        this.resetKeepAlive();
        var dataStr = util.stringify(data);
        this.bytesSent += dataStr.length;
        this.stats_.incrementCounter("bytes_sent", dataStr.length);
        var dataSegs = splitStringBySize(dataStr, WEBSOCKET_MAX_FRAME_SIZE);
        if (dataSegs.length > 1) {
          this.sendString_(String(dataSegs.length));
        }
        for (var i = 0; i < dataSegs.length; i++) {
          this.sendString_(dataSegs[i]);
        }
      };
      WebSocketConnection2.prototype.shutdown_ = function() {
        this.isClosed_ = true;
        if (this.keepaliveTimer) {
          clearInterval(this.keepaliveTimer);
          this.keepaliveTimer = null;
        }
        if (this.mySock) {
          this.mySock.close();
          this.mySock = null;
        }
      };
      WebSocketConnection2.prototype.onClosed_ = function() {
        if (!this.isClosed_) {
          this.log_("WebSocket is closing itself");
          this.shutdown_();
          if (this.onDisconnect) {
            this.onDisconnect(this.everConnected_);
            this.onDisconnect = null;
          }
        }
      };
      WebSocketConnection2.prototype.close = function() {
        if (!this.isClosed_) {
          this.log_("WebSocket is being closed");
          this.shutdown_();
        }
      };
      WebSocketConnection2.prototype.resetKeepAlive = function() {
        var _this = this;
        clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = setInterval(function() {
          if (_this.mySock) {
            _this.sendString_("0");
          }
          _this.resetKeepAlive();
        }, Math.floor(WEBSOCKET_KEEPALIVE_INTERVAL));
      };
      WebSocketConnection2.prototype.sendString_ = function(str) {
        try {
          this.mySock.send(str);
        } catch (e) {
          this.log_("Exception thrown from WebSocket.send():", e.message || e.data, "Closing connection.");
          setTimeout(this.onClosed_.bind(this), 0);
        }
      };
      WebSocketConnection2.responsesRequiredToBeHealthy = 2;
      WebSocketConnection2.healthyTimeout = 3e4;
      return WebSocketConnection2;
    }();
    var TransportManager = function() {
      function TransportManager2(repoInfo) {
        this.initTransports_(repoInfo);
      }
      Object.defineProperty(TransportManager2, "ALL_TRANSPORTS", {
        get: function() {
          return [BrowserPollConnection, WebSocketConnection];
        },
        enumerable: false,
        configurable: true
      });
      TransportManager2.prototype.initTransports_ = function(repoInfo) {
        var e_1, _a;
        var isWebSocketsAvailable2 = WebSocketConnection && WebSocketConnection["isAvailable"]();
        var isSkipPollConnection = isWebSocketsAvailable2 && !WebSocketConnection.previouslyFailed();
        if (repoInfo.webSocketOnly) {
          if (!isWebSocketsAvailable2) {
            warn("wss:// URL used, but browser isn't known to support websockets.  Trying anyway.");
          }
          isSkipPollConnection = true;
        }
        if (isSkipPollConnection) {
          this.transports_ = [WebSocketConnection];
        } else {
          var transports = this.transports_ = [];
          try {
            for (var _b = tslib.__values(TransportManager2.ALL_TRANSPORTS), _c = _b.next(); !_c.done; _c = _b.next()) {
              var transport = _c.value;
              if (transport && transport["isAvailable"]()) {
                transports.push(transport);
              }
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return))
                _a.call(_b);
            } finally {
              if (e_1)
                throw e_1.error;
            }
          }
        }
      };
      TransportManager2.prototype.initialTransport = function() {
        if (this.transports_.length > 0) {
          return this.transports_[0];
        } else {
          throw new Error("No transports available");
        }
      };
      TransportManager2.prototype.upgradeTransport = function() {
        if (this.transports_.length > 1) {
          return this.transports_[1];
        } else {
          return null;
        }
      };
      return TransportManager2;
    }();
    var UPGRADE_TIMEOUT = 6e4;
    var DELAY_BEFORE_SENDING_EXTRA_REQUESTS = 5e3;
    var BYTES_SENT_HEALTHY_OVERRIDE = 10 * 1024;
    var BYTES_RECEIVED_HEALTHY_OVERRIDE = 100 * 1024;
    var MESSAGE_TYPE = "t";
    var MESSAGE_DATA = "d";
    var CONTROL_SHUTDOWN = "s";
    var CONTROL_RESET = "r";
    var CONTROL_ERROR = "e";
    var CONTROL_PONG = "o";
    var SWITCH_ACK = "a";
    var END_TRANSMISSION = "n";
    var PING = "p";
    var SERVER_HELLO = "h";
    var Connection = function() {
      function Connection2(id, repoInfo_, applicationId_, appCheckToken_, authToken_, onMessage_, onReady_, onDisconnect_, onKill_, lastSessionId) {
        this.id = id;
        this.repoInfo_ = repoInfo_;
        this.applicationId_ = applicationId_;
        this.appCheckToken_ = appCheckToken_;
        this.authToken_ = authToken_;
        this.onMessage_ = onMessage_;
        this.onReady_ = onReady_;
        this.onDisconnect_ = onDisconnect_;
        this.onKill_ = onKill_;
        this.lastSessionId = lastSessionId;
        this.connectionCount = 0;
        this.pendingDataMessages = [];
        this.state_ = 0;
        this.log_ = logWrapper("c:" + this.id + ":");
        this.transportManager_ = new TransportManager(repoInfo_);
        this.log_("Connection created");
        this.start_();
      }
      Connection2.prototype.start_ = function() {
        var _this = this;
        var conn = this.transportManager_.initialTransport();
        this.conn_ = new conn(this.nextTransportId_(), this.repoInfo_, this.applicationId_, this.appCheckToken_, this.authToken_, null, this.lastSessionId);
        this.primaryResponsesRequired_ = conn["responsesRequiredToBeHealthy"] || 0;
        var onMessageReceived = this.connReceiver_(this.conn_);
        var onConnectionLost = this.disconnReceiver_(this.conn_);
        this.tx_ = this.conn_;
        this.rx_ = this.conn_;
        this.secondaryConn_ = null;
        this.isHealthy_ = false;
        setTimeout(function() {
          _this.conn_ && _this.conn_.open(onMessageReceived, onConnectionLost);
        }, Math.floor(0));
        var healthyTimeoutMS = conn["healthyTimeout"] || 0;
        if (healthyTimeoutMS > 0) {
          this.healthyTimeout_ = setTimeoutNonBlocking(function() {
            _this.healthyTimeout_ = null;
            if (!_this.isHealthy_) {
              if (_this.conn_ && _this.conn_.bytesReceived > BYTES_RECEIVED_HEALTHY_OVERRIDE) {
                _this.log_("Connection exceeded healthy timeout but has received " + _this.conn_.bytesReceived + " bytes.  Marking connection healthy.");
                _this.isHealthy_ = true;
                _this.conn_.markConnectionHealthy();
              } else if (_this.conn_ && _this.conn_.bytesSent > BYTES_SENT_HEALTHY_OVERRIDE) {
                _this.log_("Connection exceeded healthy timeout but has sent " + _this.conn_.bytesSent + " bytes.  Leaving connection alive.");
              } else {
                _this.log_("Closing unhealthy connection after timeout.");
                _this.close();
              }
            }
          }, Math.floor(healthyTimeoutMS));
        }
      };
      Connection2.prototype.nextTransportId_ = function() {
        return "c:" + this.id + ":" + this.connectionCount++;
      };
      Connection2.prototype.disconnReceiver_ = function(conn) {
        var _this = this;
        return function(everConnected) {
          if (conn === _this.conn_) {
            _this.onConnectionLost_(everConnected);
          } else if (conn === _this.secondaryConn_) {
            _this.log_("Secondary connection lost.");
            _this.onSecondaryConnectionLost_();
          } else {
            _this.log_("closing an old connection");
          }
        };
      };
      Connection2.prototype.connReceiver_ = function(conn) {
        var _this = this;
        return function(message) {
          if (_this.state_ !== 2) {
            if (conn === _this.rx_) {
              _this.onPrimaryMessageReceived_(message);
            } else if (conn === _this.secondaryConn_) {
              _this.onSecondaryMessageReceived_(message);
            } else {
              _this.log_("message on old connection");
            }
          }
        };
      };
      Connection2.prototype.sendRequest = function(dataMsg) {
        var msg = { t: "d", d: dataMsg };
        this.sendData_(msg);
      };
      Connection2.prototype.tryCleanupConnection = function() {
        if (this.tx_ === this.secondaryConn_ && this.rx_ === this.secondaryConn_) {
          this.log_("cleaning up and promoting a connection: " + this.secondaryConn_.connId);
          this.conn_ = this.secondaryConn_;
          this.secondaryConn_ = null;
        }
      };
      Connection2.prototype.onSecondaryControl_ = function(controlData) {
        if (MESSAGE_TYPE in controlData) {
          var cmd = controlData[MESSAGE_TYPE];
          if (cmd === SWITCH_ACK) {
            this.upgradeIfSecondaryHealthy_();
          } else if (cmd === CONTROL_RESET) {
            this.log_("Got a reset on secondary, closing it");
            this.secondaryConn_.close();
            if (this.tx_ === this.secondaryConn_ || this.rx_ === this.secondaryConn_) {
              this.close();
            }
          } else if (cmd === CONTROL_PONG) {
            this.log_("got pong on secondary.");
            this.secondaryResponsesRequired_--;
            this.upgradeIfSecondaryHealthy_();
          }
        }
      };
      Connection2.prototype.onSecondaryMessageReceived_ = function(parsedData) {
        var layer = requireKey("t", parsedData);
        var data = requireKey("d", parsedData);
        if (layer === "c") {
          this.onSecondaryControl_(data);
        } else if (layer === "d") {
          this.pendingDataMessages.push(data);
        } else {
          throw new Error("Unknown protocol layer: " + layer);
        }
      };
      Connection2.prototype.upgradeIfSecondaryHealthy_ = function() {
        if (this.secondaryResponsesRequired_ <= 0) {
          this.log_("Secondary connection is healthy.");
          this.isHealthy_ = true;
          this.secondaryConn_.markConnectionHealthy();
          this.proceedWithUpgrade_();
        } else {
          this.log_("sending ping on secondary.");
          this.secondaryConn_.send({ t: "c", d: { t: PING, d: {} } });
        }
      };
      Connection2.prototype.proceedWithUpgrade_ = function() {
        this.secondaryConn_.start();
        this.log_("sending client ack on secondary");
        this.secondaryConn_.send({ t: "c", d: { t: SWITCH_ACK, d: {} } });
        this.log_("Ending transmission on primary");
        this.conn_.send({ t: "c", d: { t: END_TRANSMISSION, d: {} } });
        this.tx_ = this.secondaryConn_;
        this.tryCleanupConnection();
      };
      Connection2.prototype.onPrimaryMessageReceived_ = function(parsedData) {
        var layer = requireKey("t", parsedData);
        var data = requireKey("d", parsedData);
        if (layer === "c") {
          this.onControl_(data);
        } else if (layer === "d") {
          this.onDataMessage_(data);
        }
      };
      Connection2.prototype.onDataMessage_ = function(message) {
        this.onPrimaryResponse_();
        this.onMessage_(message);
      };
      Connection2.prototype.onPrimaryResponse_ = function() {
        if (!this.isHealthy_) {
          this.primaryResponsesRequired_--;
          if (this.primaryResponsesRequired_ <= 0) {
            this.log_("Primary connection is healthy.");
            this.isHealthy_ = true;
            this.conn_.markConnectionHealthy();
          }
        }
      };
      Connection2.prototype.onControl_ = function(controlData) {
        var cmd = requireKey(MESSAGE_TYPE, controlData);
        if (MESSAGE_DATA in controlData) {
          var payload = controlData[MESSAGE_DATA];
          if (cmd === SERVER_HELLO) {
            this.onHandshake_(payload);
          } else if (cmd === END_TRANSMISSION) {
            this.log_("recvd end transmission on primary");
            this.rx_ = this.secondaryConn_;
            for (var i = 0; i < this.pendingDataMessages.length; ++i) {
              this.onDataMessage_(this.pendingDataMessages[i]);
            }
            this.pendingDataMessages = [];
            this.tryCleanupConnection();
          } else if (cmd === CONTROL_SHUTDOWN) {
            this.onConnectionShutdown_(payload);
          } else if (cmd === CONTROL_RESET) {
            this.onReset_(payload);
          } else if (cmd === CONTROL_ERROR) {
            error3("Server Error: " + payload);
          } else if (cmd === CONTROL_PONG) {
            this.log_("got pong on primary.");
            this.onPrimaryResponse_();
            this.sendPingOnPrimaryIfNecessary_();
          } else {
            error3("Unknown control packet command: " + cmd);
          }
        }
      };
      Connection2.prototype.onHandshake_ = function(handshake) {
        var timestamp = handshake.ts;
        var version2 = handshake.v;
        var host = handshake.h;
        this.sessionId = handshake.s;
        this.repoInfo_.host = host;
        if (this.state_ === 0) {
          this.conn_.start();
          this.onConnectionEstablished_(this.conn_, timestamp);
          if (PROTOCOL_VERSION !== version2) {
            warn("Protocol version mismatch detected");
          }
          this.tryStartUpgrade_();
        }
      };
      Connection2.prototype.tryStartUpgrade_ = function() {
        var conn = this.transportManager_.upgradeTransport();
        if (conn) {
          this.startUpgrade_(conn);
        }
      };
      Connection2.prototype.startUpgrade_ = function(conn) {
        var _this = this;
        this.secondaryConn_ = new conn(this.nextTransportId_(), this.repoInfo_, this.applicationId_, this.appCheckToken_, this.authToken_, this.sessionId);
        this.secondaryResponsesRequired_ = conn["responsesRequiredToBeHealthy"] || 0;
        var onMessage = this.connReceiver_(this.secondaryConn_);
        var onDisconnect = this.disconnReceiver_(this.secondaryConn_);
        this.secondaryConn_.open(onMessage, onDisconnect);
        setTimeoutNonBlocking(function() {
          if (_this.secondaryConn_) {
            _this.log_("Timed out trying to upgrade.");
            _this.secondaryConn_.close();
          }
        }, Math.floor(UPGRADE_TIMEOUT));
      };
      Connection2.prototype.onReset_ = function(host) {
        this.log_("Reset packet received.  New host: " + host);
        this.repoInfo_.host = host;
        if (this.state_ === 1) {
          this.close();
        } else {
          this.closeConnections_();
          this.start_();
        }
      };
      Connection2.prototype.onConnectionEstablished_ = function(conn, timestamp) {
        var _this = this;
        this.log_("Realtime connection established.");
        this.conn_ = conn;
        this.state_ = 1;
        if (this.onReady_) {
          this.onReady_(timestamp, this.sessionId);
          this.onReady_ = null;
        }
        if (this.primaryResponsesRequired_ === 0) {
          this.log_("Primary connection is healthy.");
          this.isHealthy_ = true;
        } else {
          setTimeoutNonBlocking(function() {
            _this.sendPingOnPrimaryIfNecessary_();
          }, Math.floor(DELAY_BEFORE_SENDING_EXTRA_REQUESTS));
        }
      };
      Connection2.prototype.sendPingOnPrimaryIfNecessary_ = function() {
        if (!this.isHealthy_ && this.state_ === 1) {
          this.log_("sending ping on primary.");
          this.sendData_({ t: "c", d: { t: PING, d: {} } });
        }
      };
      Connection2.prototype.onSecondaryConnectionLost_ = function() {
        var conn = this.secondaryConn_;
        this.secondaryConn_ = null;
        if (this.tx_ === conn || this.rx_ === conn) {
          this.close();
        }
      };
      Connection2.prototype.onConnectionLost_ = function(everConnected) {
        this.conn_ = null;
        if (!everConnected && this.state_ === 0) {
          this.log_("Realtime connection failed.");
          if (this.repoInfo_.isCacheableHost()) {
            PersistentStorage.remove("host:" + this.repoInfo_.host);
            this.repoInfo_.internalHost = this.repoInfo_.host;
          }
        } else if (this.state_ === 1) {
          this.log_("Realtime connection lost.");
        }
        this.close();
      };
      Connection2.prototype.onConnectionShutdown_ = function(reason) {
        this.log_("Connection shutdown command received. Shutting down...");
        if (this.onKill_) {
          this.onKill_(reason);
          this.onKill_ = null;
        }
        this.onDisconnect_ = null;
        this.close();
      };
      Connection2.prototype.sendData_ = function(data) {
        if (this.state_ !== 1) {
          throw "Connection is not connected";
        } else {
          this.tx_.send(data);
        }
      };
      Connection2.prototype.close = function() {
        if (this.state_ !== 2) {
          this.log_("Closing realtime connection.");
          this.state_ = 2;
          this.closeConnections_();
          if (this.onDisconnect_) {
            this.onDisconnect_();
            this.onDisconnect_ = null;
          }
        }
      };
      Connection2.prototype.closeConnections_ = function() {
        this.log_("Shutting down all connections");
        if (this.conn_) {
          this.conn_.close();
          this.conn_ = null;
        }
        if (this.secondaryConn_) {
          this.secondaryConn_.close();
          this.secondaryConn_ = null;
        }
        if (this.healthyTimeout_) {
          clearTimeout(this.healthyTimeout_);
          this.healthyTimeout_ = null;
        }
      };
      return Connection2;
    }();
    var ServerActions = function() {
      function ServerActions2() {
      }
      ServerActions2.prototype.put = function(pathString, data, onComplete, hash2) {
      };
      ServerActions2.prototype.merge = function(pathString, data, onComplete, hash2) {
      };
      ServerActions2.prototype.refreshAuthToken = function(token) {
      };
      ServerActions2.prototype.refreshAppCheckToken = function(token) {
      };
      ServerActions2.prototype.onDisconnectPut = function(pathString, data, onComplete) {
      };
      ServerActions2.prototype.onDisconnectMerge = function(pathString, data, onComplete) {
      };
      ServerActions2.prototype.onDisconnectCancel = function(pathString, onComplete) {
      };
      ServerActions2.prototype.reportStats = function(stats2) {
      };
      return ServerActions2;
    }();
    var EventEmitter = function() {
      function EventEmitter2(allowedEvents_) {
        this.allowedEvents_ = allowedEvents_;
        this.listeners_ = {};
        util.assert(Array.isArray(allowedEvents_) && allowedEvents_.length > 0, "Requires a non-empty array");
      }
      EventEmitter2.prototype.trigger = function(eventType) {
        var varArgs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
          varArgs[_i - 1] = arguments[_i];
        }
        if (Array.isArray(this.listeners_[eventType])) {
          var listeners = tslib.__spreadArray([], tslib.__read(this.listeners_[eventType]));
          for (var i = 0; i < listeners.length; i++) {
            listeners[i].callback.apply(listeners[i].context, varArgs);
          }
        }
      };
      EventEmitter2.prototype.on = function(eventType, callback, context) {
        this.validateEventType_(eventType);
        this.listeners_[eventType] = this.listeners_[eventType] || [];
        this.listeners_[eventType].push({ callback, context });
        var eventData = this.getInitialEvent(eventType);
        if (eventData) {
          callback.apply(context, eventData);
        }
      };
      EventEmitter2.prototype.off = function(eventType, callback, context) {
        this.validateEventType_(eventType);
        var listeners = this.listeners_[eventType] || [];
        for (var i = 0; i < listeners.length; i++) {
          if (listeners[i].callback === callback && (!context || context === listeners[i].context)) {
            listeners.splice(i, 1);
            return;
          }
        }
      };
      EventEmitter2.prototype.validateEventType_ = function(eventType) {
        util.assert(this.allowedEvents_.find(function(et) {
          return et === eventType;
        }), "Unknown event: " + eventType);
      };
      return EventEmitter2;
    }();
    var OnlineMonitor = function(_super) {
      tslib.__extends(OnlineMonitor2, _super);
      function OnlineMonitor2() {
        var _this = _super.call(this, ["online"]) || this;
        _this.online_ = true;
        if (typeof window !== "undefined" && typeof window.addEventListener !== "undefined" && !util.isMobileCordova()) {
          window.addEventListener("online", function() {
            if (!_this.online_) {
              _this.online_ = true;
              _this.trigger("online", true);
            }
          }, false);
          window.addEventListener("offline", function() {
            if (_this.online_) {
              _this.online_ = false;
              _this.trigger("online", false);
            }
          }, false);
        }
        return _this;
      }
      OnlineMonitor2.getInstance = function() {
        return new OnlineMonitor2();
      };
      OnlineMonitor2.prototype.getInitialEvent = function(eventType) {
        util.assert(eventType === "online", "Unknown event type: " + eventType);
        return [this.online_];
      };
      OnlineMonitor2.prototype.currentlyOnline = function() {
        return this.online_;
      };
      return OnlineMonitor2;
    }(EventEmitter);
    var MAX_PATH_DEPTH = 32;
    var MAX_PATH_LENGTH_BYTES = 768;
    var Path = function() {
      function Path2(pathOrString, pieceNum) {
        if (pieceNum === void 0) {
          this.pieces_ = pathOrString.split("/");
          var copyTo = 0;
          for (var i = 0; i < this.pieces_.length; i++) {
            if (this.pieces_[i].length > 0) {
              this.pieces_[copyTo] = this.pieces_[i];
              copyTo++;
            }
          }
          this.pieces_.length = copyTo;
          this.pieceNum_ = 0;
        } else {
          this.pieces_ = pathOrString;
          this.pieceNum_ = pieceNum;
        }
      }
      Path2.prototype.toString = function() {
        var pathString = "";
        for (var i = this.pieceNum_; i < this.pieces_.length; i++) {
          if (this.pieces_[i] !== "") {
            pathString += "/" + this.pieces_[i];
          }
        }
        return pathString || "/";
      };
      return Path2;
    }();
    function newEmptyPath() {
      return new Path("");
    }
    function pathGetFront(path) {
      if (path.pieceNum_ >= path.pieces_.length) {
        return null;
      }
      return path.pieces_[path.pieceNum_];
    }
    function pathGetLength(path) {
      return path.pieces_.length - path.pieceNum_;
    }
    function pathPopFront(path) {
      var pieceNum = path.pieceNum_;
      if (pieceNum < path.pieces_.length) {
        pieceNum++;
      }
      return new Path(path.pieces_, pieceNum);
    }
    function pathGetBack(path) {
      if (path.pieceNum_ < path.pieces_.length) {
        return path.pieces_[path.pieces_.length - 1];
      }
      return null;
    }
    function pathToUrlEncodedString(path) {
      var pathString = "";
      for (var i = path.pieceNum_; i < path.pieces_.length; i++) {
        if (path.pieces_[i] !== "") {
          pathString += "/" + encodeURIComponent(String(path.pieces_[i]));
        }
      }
      return pathString || "/";
    }
    function pathSlice(path, begin) {
      if (begin === void 0) {
        begin = 0;
      }
      return path.pieces_.slice(path.pieceNum_ + begin);
    }
    function pathParent(path) {
      if (path.pieceNum_ >= path.pieces_.length) {
        return null;
      }
      var pieces = [];
      for (var i = path.pieceNum_; i < path.pieces_.length - 1; i++) {
        pieces.push(path.pieces_[i]);
      }
      return new Path(pieces, 0);
    }
    function pathChild(path, childPathObj) {
      var pieces = [];
      for (var i = path.pieceNum_; i < path.pieces_.length; i++) {
        pieces.push(path.pieces_[i]);
      }
      if (childPathObj instanceof Path) {
        for (var i = childPathObj.pieceNum_; i < childPathObj.pieces_.length; i++) {
          pieces.push(childPathObj.pieces_[i]);
        }
      } else {
        var childPieces = childPathObj.split("/");
        for (var i = 0; i < childPieces.length; i++) {
          if (childPieces[i].length > 0) {
            pieces.push(childPieces[i]);
          }
        }
      }
      return new Path(pieces, 0);
    }
    function pathIsEmpty(path) {
      return path.pieceNum_ >= path.pieces_.length;
    }
    function newRelativePath(outerPath, innerPath) {
      var outer = pathGetFront(outerPath), inner = pathGetFront(innerPath);
      if (outer === null) {
        return innerPath;
      } else if (outer === inner) {
        return newRelativePath(pathPopFront(outerPath), pathPopFront(innerPath));
      } else {
        throw new Error("INTERNAL ERROR: innerPath (" + innerPath + ") is not within outerPath (" + outerPath + ")");
      }
    }
    function pathCompare(left, right) {
      var leftKeys = pathSlice(left, 0);
      var rightKeys = pathSlice(right, 0);
      for (var i = 0; i < leftKeys.length && i < rightKeys.length; i++) {
        var cmp = nameCompare(leftKeys[i], rightKeys[i]);
        if (cmp !== 0) {
          return cmp;
        }
      }
      if (leftKeys.length === rightKeys.length) {
        return 0;
      }
      return leftKeys.length < rightKeys.length ? -1 : 1;
    }
    function pathEquals(path, other) {
      if (pathGetLength(path) !== pathGetLength(other)) {
        return false;
      }
      for (var i = path.pieceNum_, j = other.pieceNum_; i <= path.pieces_.length; i++, j++) {
        if (path.pieces_[i] !== other.pieces_[j]) {
          return false;
        }
      }
      return true;
    }
    function pathContains(path, other) {
      var i = path.pieceNum_;
      var j = other.pieceNum_;
      if (pathGetLength(path) > pathGetLength(other)) {
        return false;
      }
      while (i < path.pieces_.length) {
        if (path.pieces_[i] !== other.pieces_[j]) {
          return false;
        }
        ++i;
        ++j;
      }
      return true;
    }
    var ValidationPath = function() {
      function ValidationPath2(path, errorPrefix_) {
        this.errorPrefix_ = errorPrefix_;
        this.parts_ = pathSlice(path, 0);
        this.byteLength_ = Math.max(1, this.parts_.length);
        for (var i = 0; i < this.parts_.length; i++) {
          this.byteLength_ += util.stringLength(this.parts_[i]);
        }
        validationPathCheckValid(this);
      }
      return ValidationPath2;
    }();
    function validationPathPush(validationPath, child2) {
      if (validationPath.parts_.length > 0) {
        validationPath.byteLength_ += 1;
      }
      validationPath.parts_.push(child2);
      validationPath.byteLength_ += util.stringLength(child2);
      validationPathCheckValid(validationPath);
    }
    function validationPathPop(validationPath) {
      var last = validationPath.parts_.pop();
      validationPath.byteLength_ -= util.stringLength(last);
      if (validationPath.parts_.length > 0) {
        validationPath.byteLength_ -= 1;
      }
    }
    function validationPathCheckValid(validationPath) {
      if (validationPath.byteLength_ > MAX_PATH_LENGTH_BYTES) {
        throw new Error(validationPath.errorPrefix_ + "has a key path longer than " + MAX_PATH_LENGTH_BYTES + " bytes (" + validationPath.byteLength_ + ").");
      }
      if (validationPath.parts_.length > MAX_PATH_DEPTH) {
        throw new Error(validationPath.errorPrefix_ + "path specified exceeds the maximum depth that can be written (" + MAX_PATH_DEPTH + ") or object contains a cycle " + validationPathToErrorString(validationPath));
      }
    }
    function validationPathToErrorString(validationPath) {
      if (validationPath.parts_.length === 0) {
        return "";
      }
      return "in property '" + validationPath.parts_.join(".") + "'";
    }
    var VisibilityMonitor = function(_super) {
      tslib.__extends(VisibilityMonitor2, _super);
      function VisibilityMonitor2() {
        var _this = _super.call(this, ["visible"]) || this;
        var hidden;
        var visibilityChange;
        if (typeof document !== "undefined" && typeof document.addEventListener !== "undefined") {
          if (typeof document["hidden"] !== "undefined") {
            visibilityChange = "visibilitychange";
            hidden = "hidden";
          } else if (typeof document["mozHidden"] !== "undefined") {
            visibilityChange = "mozvisibilitychange";
            hidden = "mozHidden";
          } else if (typeof document["msHidden"] !== "undefined") {
            visibilityChange = "msvisibilitychange";
            hidden = "msHidden";
          } else if (typeof document["webkitHidden"] !== "undefined") {
            visibilityChange = "webkitvisibilitychange";
            hidden = "webkitHidden";
          }
        }
        _this.visible_ = true;
        if (visibilityChange) {
          document.addEventListener(visibilityChange, function() {
            var visible = !document[hidden];
            if (visible !== _this.visible_) {
              _this.visible_ = visible;
              _this.trigger("visible", visible);
            }
          }, false);
        }
        return _this;
      }
      VisibilityMonitor2.getInstance = function() {
        return new VisibilityMonitor2();
      };
      VisibilityMonitor2.prototype.getInitialEvent = function(eventType) {
        util.assert(eventType === "visible", "Unknown event type: " + eventType);
        return [this.visible_];
      };
      return VisibilityMonitor2;
    }(EventEmitter);
    var RECONNECT_MIN_DELAY = 1e3;
    var RECONNECT_MAX_DELAY_DEFAULT = 60 * 5 * 1e3;
    var GET_CONNECT_TIMEOUT = 3 * 1e3;
    var RECONNECT_MAX_DELAY_FOR_ADMINS = 30 * 1e3;
    var RECONNECT_DELAY_MULTIPLIER = 1.3;
    var RECONNECT_DELAY_RESET_TIMEOUT = 3e4;
    var SERVER_KILL_INTERRUPT_REASON = "server_kill";
    var INVALID_TOKEN_THRESHOLD = 3;
    var PersistentConnection = function(_super) {
      tslib.__extends(PersistentConnection2, _super);
      function PersistentConnection2(repoInfo_, applicationId_, onDataUpdate_, onConnectStatus_, onServerInfoUpdate_, authTokenProvider_, appCheckTokenProvider_, authOverride_) {
        var _this = _super.call(this) || this;
        _this.repoInfo_ = repoInfo_;
        _this.applicationId_ = applicationId_;
        _this.onDataUpdate_ = onDataUpdate_;
        _this.onConnectStatus_ = onConnectStatus_;
        _this.onServerInfoUpdate_ = onServerInfoUpdate_;
        _this.authTokenProvider_ = authTokenProvider_;
        _this.appCheckTokenProvider_ = appCheckTokenProvider_;
        _this.authOverride_ = authOverride_;
        _this.id = PersistentConnection2.nextPersistentConnectionId_++;
        _this.log_ = logWrapper("p:" + _this.id + ":");
        _this.interruptReasons_ = {};
        _this.listens = new Map();
        _this.outstandingPuts_ = [];
        _this.outstandingGets_ = [];
        _this.outstandingPutCount_ = 0;
        _this.outstandingGetCount_ = 0;
        _this.onDisconnectRequestQueue_ = [];
        _this.connected_ = false;
        _this.reconnectDelay_ = RECONNECT_MIN_DELAY;
        _this.maxReconnectDelay_ = RECONNECT_MAX_DELAY_DEFAULT;
        _this.securityDebugCallback_ = null;
        _this.lastSessionId = null;
        _this.establishConnectionTimer_ = null;
        _this.visible_ = false;
        _this.requestCBHash_ = {};
        _this.requestNumber_ = 0;
        _this.realtime_ = null;
        _this.authToken_ = null;
        _this.appCheckToken_ = null;
        _this.forceTokenRefresh_ = false;
        _this.invalidAuthTokenCount_ = 0;
        _this.invalidAppCheckTokenCount_ = 0;
        _this.firstConnection_ = true;
        _this.lastConnectionAttemptTime_ = null;
        _this.lastConnectionEstablishedTime_ = null;
        if (authOverride_ && !util.isNodeSdk()) {
          throw new Error("Auth override specified in options, but not supported on non Node.js platforms");
        }
        VisibilityMonitor.getInstance().on("visible", _this.onVisible_, _this);
        if (repoInfo_.host.indexOf("fblocal") === -1) {
          OnlineMonitor.getInstance().on("online", _this.onOnline_, _this);
        }
        return _this;
      }
      PersistentConnection2.prototype.sendRequest = function(action, body, onResponse) {
        var curReqNum = ++this.requestNumber_;
        var msg = { r: curReqNum, a: action, b: body };
        this.log_(util.stringify(msg));
        util.assert(this.connected_, "sendRequest call when we're not connected not allowed.");
        this.realtime_.sendRequest(msg);
        if (onResponse) {
          this.requestCBHash_[curReqNum] = onResponse;
        }
      };
      PersistentConnection2.prototype.get = function(query2) {
        var _this = this;
        this.initConnection_();
        var deferred = new util.Deferred();
        var request = {
          p: query2._path.toString(),
          q: query2._queryObject
        };
        var outstandingGet = {
          action: "g",
          request,
          onComplete: function(message) {
            var payload = message["d"];
            if (message["s"] === "ok") {
              _this.onDataUpdate_(request["p"], payload, false, null);
              deferred.resolve(payload);
            } else {
              deferred.reject(payload);
            }
          }
        };
        this.outstandingGets_.push(outstandingGet);
        this.outstandingGetCount_++;
        var index2 = this.outstandingGets_.length - 1;
        if (!this.connected_) {
          setTimeout(function() {
            var get2 = _this.outstandingGets_[index2];
            if (get2 === void 0 || outstandingGet !== get2) {
              return;
            }
            delete _this.outstandingGets_[index2];
            _this.outstandingGetCount_--;
            if (_this.outstandingGetCount_ === 0) {
              _this.outstandingGets_ = [];
            }
            _this.log_("get " + index2 + " timed out on connection");
            deferred.reject(new Error("Client is offline."));
          }, GET_CONNECT_TIMEOUT);
        }
        if (this.connected_) {
          this.sendGet_(index2);
        }
        return deferred.promise;
      };
      PersistentConnection2.prototype.listen = function(query2, currentHashFn, tag, onComplete) {
        this.initConnection_();
        var queryId = query2._queryIdentifier;
        var pathString = query2._path.toString();
        this.log_("Listen called for " + pathString + " " + queryId);
        if (!this.listens.has(pathString)) {
          this.listens.set(pathString, new Map());
        }
        util.assert(query2._queryParams.isDefault() || !query2._queryParams.loadsAllData(), "listen() called for non-default but complete query");
        util.assert(!this.listens.get(pathString).has(queryId), "listen() called twice for same path/queryId.");
        var listenSpec = {
          onComplete,
          hashFn: currentHashFn,
          query: query2,
          tag
        };
        this.listens.get(pathString).set(queryId, listenSpec);
        if (this.connected_) {
          this.sendListen_(listenSpec);
        }
      };
      PersistentConnection2.prototype.sendGet_ = function(index2) {
        var _this = this;
        var get2 = this.outstandingGets_[index2];
        this.sendRequest("g", get2.request, function(message) {
          delete _this.outstandingGets_[index2];
          _this.outstandingGetCount_--;
          if (_this.outstandingGetCount_ === 0) {
            _this.outstandingGets_ = [];
          }
          if (get2.onComplete) {
            get2.onComplete(message);
          }
        });
      };
      PersistentConnection2.prototype.sendListen_ = function(listenSpec) {
        var _this = this;
        var query2 = listenSpec.query;
        var pathString = query2._path.toString();
        var queryId = query2._queryIdentifier;
        this.log_("Listen on " + pathString + " for " + queryId);
        var req = { p: pathString };
        var action = "q";
        if (listenSpec.tag) {
          req["q"] = query2._queryObject;
          req["t"] = listenSpec.tag;
        }
        req["h"] = listenSpec.hashFn();
        this.sendRequest(action, req, function(message) {
          var payload = message["d"];
          var status = message["s"];
          PersistentConnection2.warnOnListenWarnings_(payload, query2);
          var currentListenSpec = _this.listens.get(pathString) && _this.listens.get(pathString).get(queryId);
          if (currentListenSpec === listenSpec) {
            _this.log_("listen response", message);
            if (status !== "ok") {
              _this.removeListen_(pathString, queryId);
            }
            if (listenSpec.onComplete) {
              listenSpec.onComplete(status, payload);
            }
          }
        });
      };
      PersistentConnection2.warnOnListenWarnings_ = function(payload, query2) {
        if (payload && typeof payload === "object" && util.contains(payload, "w")) {
          var warnings = util.safeGet(payload, "w");
          if (Array.isArray(warnings) && ~warnings.indexOf("no_index")) {
            var indexSpec = '".indexOn": "' + query2._queryParams.getIndex().toString() + '"';
            var indexPath = query2._path.toString();
            warn("Using an unspecified index. Your data will be downloaded and " + ("filtered on the client. Consider adding " + indexSpec + " at ") + (indexPath + " to your security rules for better performance."));
          }
        }
      };
      PersistentConnection2.prototype.refreshAuthToken = function(token) {
        this.authToken_ = token;
        this.log_("Auth token refreshed");
        if (this.authToken_) {
          this.tryAuth();
        } else {
          if (this.connected_) {
            this.sendRequest("unauth", {}, function() {
            });
          }
        }
        this.reduceReconnectDelayIfAdminCredential_(token);
      };
      PersistentConnection2.prototype.reduceReconnectDelayIfAdminCredential_ = function(credential) {
        var isFirebaseSecret = credential && credential.length === 40;
        if (isFirebaseSecret || util.isAdmin(credential)) {
          this.log_("Admin auth credential detected.  Reducing max reconnect time.");
          this.maxReconnectDelay_ = RECONNECT_MAX_DELAY_FOR_ADMINS;
        }
      };
      PersistentConnection2.prototype.refreshAppCheckToken = function(token) {
        this.appCheckToken_ = token;
        this.log_("App check token refreshed");
        if (this.appCheckToken_) {
          this.tryAppCheck();
        } else {
          if (this.connected_) {
            this.sendRequest("unappeck", {}, function() {
            });
          }
        }
      };
      PersistentConnection2.prototype.tryAuth = function() {
        var _this = this;
        if (this.connected_ && this.authToken_) {
          var token_1 = this.authToken_;
          var authMethod = util.isValidFormat(token_1) ? "auth" : "gauth";
          var requestData = { cred: token_1 };
          if (this.authOverride_ === null) {
            requestData["noauth"] = true;
          } else if (typeof this.authOverride_ === "object") {
            requestData["authvar"] = this.authOverride_;
          }
          this.sendRequest(authMethod, requestData, function(res) {
            var status = res["s"];
            var data = res["d"] || "error";
            if (_this.authToken_ === token_1) {
              if (status === "ok") {
                _this.invalidAuthTokenCount_ = 0;
              } else {
                _this.onAuthRevoked_(status, data);
              }
            }
          });
        }
      };
      PersistentConnection2.prototype.tryAppCheck = function() {
        var _this = this;
        if (this.connected_ && this.appCheckToken_) {
          this.sendRequest("appcheck", { "token": this.appCheckToken_ }, function(res) {
            var status = res["s"];
            var data = res["d"] || "error";
            if (status === "ok") {
              _this.invalidAppCheckTokenCount_ = 0;
            } else {
              _this.onAppCheckRevoked_(status, data);
            }
          });
        }
      };
      PersistentConnection2.prototype.unlisten = function(query2, tag) {
        var pathString = query2._path.toString();
        var queryId = query2._queryIdentifier;
        this.log_("Unlisten called for " + pathString + " " + queryId);
        util.assert(query2._queryParams.isDefault() || !query2._queryParams.loadsAllData(), "unlisten() called for non-default but complete query");
        var listen = this.removeListen_(pathString, queryId);
        if (listen && this.connected_) {
          this.sendUnlisten_(pathString, queryId, query2._queryObject, tag);
        }
      };
      PersistentConnection2.prototype.sendUnlisten_ = function(pathString, queryId, queryObj, tag) {
        this.log_("Unlisten on " + pathString + " for " + queryId);
        var req = { p: pathString };
        var action = "n";
        if (tag) {
          req["q"] = queryObj;
          req["t"] = tag;
        }
        this.sendRequest(action, req);
      };
      PersistentConnection2.prototype.onDisconnectPut = function(pathString, data, onComplete) {
        this.initConnection_();
        if (this.connected_) {
          this.sendOnDisconnect_("o", pathString, data, onComplete);
        } else {
          this.onDisconnectRequestQueue_.push({
            pathString,
            action: "o",
            data,
            onComplete
          });
        }
      };
      PersistentConnection2.prototype.onDisconnectMerge = function(pathString, data, onComplete) {
        this.initConnection_();
        if (this.connected_) {
          this.sendOnDisconnect_("om", pathString, data, onComplete);
        } else {
          this.onDisconnectRequestQueue_.push({
            pathString,
            action: "om",
            data,
            onComplete
          });
        }
      };
      PersistentConnection2.prototype.onDisconnectCancel = function(pathString, onComplete) {
        this.initConnection_();
        if (this.connected_) {
          this.sendOnDisconnect_("oc", pathString, null, onComplete);
        } else {
          this.onDisconnectRequestQueue_.push({
            pathString,
            action: "oc",
            data: null,
            onComplete
          });
        }
      };
      PersistentConnection2.prototype.sendOnDisconnect_ = function(action, pathString, data, onComplete) {
        var request = { p: pathString, d: data };
        this.log_("onDisconnect " + action, request);
        this.sendRequest(action, request, function(response) {
          if (onComplete) {
            setTimeout(function() {
              onComplete(response["s"], response["d"]);
            }, Math.floor(0));
          }
        });
      };
      PersistentConnection2.prototype.put = function(pathString, data, onComplete, hash2) {
        this.putInternal("p", pathString, data, onComplete, hash2);
      };
      PersistentConnection2.prototype.merge = function(pathString, data, onComplete, hash2) {
        this.putInternal("m", pathString, data, onComplete, hash2);
      };
      PersistentConnection2.prototype.putInternal = function(action, pathString, data, onComplete, hash2) {
        this.initConnection_();
        var request = {
          p: pathString,
          d: data
        };
        if (hash2 !== void 0) {
          request["h"] = hash2;
        }
        this.outstandingPuts_.push({
          action,
          request,
          onComplete
        });
        this.outstandingPutCount_++;
        var index2 = this.outstandingPuts_.length - 1;
        if (this.connected_) {
          this.sendPut_(index2);
        } else {
          this.log_("Buffering put: " + pathString);
        }
      };
      PersistentConnection2.prototype.sendPut_ = function(index2) {
        var _this = this;
        var action = this.outstandingPuts_[index2].action;
        var request = this.outstandingPuts_[index2].request;
        var onComplete = this.outstandingPuts_[index2].onComplete;
        this.outstandingPuts_[index2].queued = this.connected_;
        this.sendRequest(action, request, function(message) {
          _this.log_(action + " response", message);
          delete _this.outstandingPuts_[index2];
          _this.outstandingPutCount_--;
          if (_this.outstandingPutCount_ === 0) {
            _this.outstandingPuts_ = [];
          }
          if (onComplete) {
            onComplete(message["s"], message["d"]);
          }
        });
      };
      PersistentConnection2.prototype.reportStats = function(stats2) {
        var _this = this;
        if (this.connected_) {
          var request = { c: stats2 };
          this.log_("reportStats", request);
          this.sendRequest("s", request, function(result) {
            var status = result["s"];
            if (status !== "ok") {
              var errorReason = result["d"];
              _this.log_("reportStats", "Error sending stats: " + errorReason);
            }
          });
        }
      };
      PersistentConnection2.prototype.onDataMessage_ = function(message) {
        if ("r" in message) {
          this.log_("from server: " + util.stringify(message));
          var reqNum = message["r"];
          var onResponse = this.requestCBHash_[reqNum];
          if (onResponse) {
            delete this.requestCBHash_[reqNum];
            onResponse(message["b"]);
          }
        } else if ("error" in message) {
          throw "A server-side error has occurred: " + message["error"];
        } else if ("a" in message) {
          this.onDataPush_(message["a"], message["b"]);
        }
      };
      PersistentConnection2.prototype.onDataPush_ = function(action, body) {
        this.log_("handleServerMessage", action, body);
        if (action === "d") {
          this.onDataUpdate_(body["p"], body["d"], false, body["t"]);
        } else if (action === "m") {
          this.onDataUpdate_(body["p"], body["d"], true, body["t"]);
        } else if (action === "c") {
          this.onListenRevoked_(body["p"], body["q"]);
        } else if (action === "ac") {
          this.onAuthRevoked_(body["s"], body["d"]);
        } else if (action === "apc") {
          this.onAppCheckRevoked_(body["s"], body["d"]);
        } else if (action === "sd") {
          this.onSecurityDebugPacket_(body);
        } else {
          error3("Unrecognized action received from server: " + util.stringify(action) + "\nAre you using the latest client?");
        }
      };
      PersistentConnection2.prototype.onReady_ = function(timestamp, sessionId) {
        this.log_("connection ready");
        this.connected_ = true;
        this.lastConnectionEstablishedTime_ = new Date().getTime();
        this.handleTimestamp_(timestamp);
        this.lastSessionId = sessionId;
        if (this.firstConnection_) {
          this.sendConnectStats_();
        }
        this.restoreState_();
        this.firstConnection_ = false;
        this.onConnectStatus_(true);
      };
      PersistentConnection2.prototype.scheduleConnect_ = function(timeout) {
        var _this = this;
        util.assert(!this.realtime_, "Scheduling a connect when we're already connected/ing?");
        if (this.establishConnectionTimer_) {
          clearTimeout(this.establishConnectionTimer_);
        }
        this.establishConnectionTimer_ = setTimeout(function() {
          _this.establishConnectionTimer_ = null;
          _this.establishConnection_();
        }, Math.floor(timeout));
      };
      PersistentConnection2.prototype.initConnection_ = function() {
        if (!this.realtime_ && this.firstConnection_) {
          this.scheduleConnect_(0);
        }
      };
      PersistentConnection2.prototype.onVisible_ = function(visible) {
        if (visible && !this.visible_ && this.reconnectDelay_ === this.maxReconnectDelay_) {
          this.log_("Window became visible.  Reducing delay.");
          this.reconnectDelay_ = RECONNECT_MIN_DELAY;
          if (!this.realtime_) {
            this.scheduleConnect_(0);
          }
        }
        this.visible_ = visible;
      };
      PersistentConnection2.prototype.onOnline_ = function(online) {
        if (online) {
          this.log_("Browser went online.");
          this.reconnectDelay_ = RECONNECT_MIN_DELAY;
          if (!this.realtime_) {
            this.scheduleConnect_(0);
          }
        } else {
          this.log_("Browser went offline.  Killing connection.");
          if (this.realtime_) {
            this.realtime_.close();
          }
        }
      };
      PersistentConnection2.prototype.onRealtimeDisconnect_ = function() {
        this.log_("data client disconnected");
        this.connected_ = false;
        this.realtime_ = null;
        this.cancelSentTransactions_();
        this.requestCBHash_ = {};
        if (this.shouldReconnect_()) {
          if (!this.visible_) {
            this.log_("Window isn't visible.  Delaying reconnect.");
            this.reconnectDelay_ = this.maxReconnectDelay_;
            this.lastConnectionAttemptTime_ = new Date().getTime();
          } else if (this.lastConnectionEstablishedTime_) {
            var timeSinceLastConnectSucceeded = new Date().getTime() - this.lastConnectionEstablishedTime_;
            if (timeSinceLastConnectSucceeded > RECONNECT_DELAY_RESET_TIMEOUT) {
              this.reconnectDelay_ = RECONNECT_MIN_DELAY;
            }
            this.lastConnectionEstablishedTime_ = null;
          }
          var timeSinceLastConnectAttempt = new Date().getTime() - this.lastConnectionAttemptTime_;
          var reconnectDelay = Math.max(0, this.reconnectDelay_ - timeSinceLastConnectAttempt);
          reconnectDelay = Math.random() * reconnectDelay;
          this.log_("Trying to reconnect in " + reconnectDelay + "ms");
          this.scheduleConnect_(reconnectDelay);
          this.reconnectDelay_ = Math.min(this.maxReconnectDelay_, this.reconnectDelay_ * RECONNECT_DELAY_MULTIPLIER);
        }
        this.onConnectStatus_(false);
      };
      PersistentConnection2.prototype.establishConnection_ = function() {
        return tslib.__awaiter(this, void 0, void 0, function() {
          var onDataMessage, onReady, onDisconnect_1, connId, lastSessionId, canceled_1, connection_1, closeFn, sendRequestFn, forceRefresh, _a, authToken, appCheckToken, error_1;
          var _this = this;
          return tslib.__generator(this, function(_b) {
            switch (_b.label) {
              case 0:
                if (!this.shouldReconnect_())
                  return [3, 4];
                this.log_("Making a connection attempt");
                this.lastConnectionAttemptTime_ = new Date().getTime();
                this.lastConnectionEstablishedTime_ = null;
                onDataMessage = this.onDataMessage_.bind(this);
                onReady = this.onReady_.bind(this);
                onDisconnect_1 = this.onRealtimeDisconnect_.bind(this);
                connId = this.id + ":" + PersistentConnection2.nextConnectionId_++;
                lastSessionId = this.lastSessionId;
                canceled_1 = false;
                connection_1 = null;
                closeFn = function() {
                  if (connection_1) {
                    connection_1.close();
                  } else {
                    canceled_1 = true;
                    onDisconnect_1();
                  }
                };
                sendRequestFn = function(msg) {
                  util.assert(connection_1, "sendRequest call when we're not connected not allowed.");
                  connection_1.sendRequest(msg);
                };
                this.realtime_ = {
                  close: closeFn,
                  sendRequest: sendRequestFn
                };
                forceRefresh = this.forceTokenRefresh_;
                this.forceTokenRefresh_ = false;
                _b.label = 1;
              case 1:
                _b.trys.push([1, 3, , 4]);
                return [4, Promise.all([
                  this.authTokenProvider_.getToken(forceRefresh),
                  this.appCheckTokenProvider_.getToken(forceRefresh)
                ])];
              case 2:
                _a = tslib.__read.apply(void 0, [_b.sent(), 2]), authToken = _a[0], appCheckToken = _a[1];
                if (!canceled_1) {
                  log("getToken() completed. Creating connection.");
                  this.authToken_ = authToken && authToken.accessToken;
                  this.appCheckToken_ = appCheckToken && appCheckToken.token;
                  connection_1 = new Connection(connId, this.repoInfo_, this.applicationId_, this.appCheckToken_, this.authToken_, onDataMessage, onReady, onDisconnect_1, function(reason) {
                    warn(reason + " (" + _this.repoInfo_.toString() + ")");
                    _this.interrupt(SERVER_KILL_INTERRUPT_REASON);
                  }, lastSessionId);
                } else {
                  log("getToken() completed but was canceled");
                }
                return [3, 4];
              case 3:
                error_1 = _b.sent();
                this.log_("Failed to get token: " + error_1);
                if (!canceled_1) {
                  if (this.repoInfo_.nodeAdmin) {
                    warn(error_1);
                  }
                  closeFn();
                }
                return [3, 4];
              case 4:
                return [2];
            }
          });
        });
      };
      PersistentConnection2.prototype.interrupt = function(reason) {
        log("Interrupting connection for reason: " + reason);
        this.interruptReasons_[reason] = true;
        if (this.realtime_) {
          this.realtime_.close();
        } else {
          if (this.establishConnectionTimer_) {
            clearTimeout(this.establishConnectionTimer_);
            this.establishConnectionTimer_ = null;
          }
          if (this.connected_) {
            this.onRealtimeDisconnect_();
          }
        }
      };
      PersistentConnection2.prototype.resume = function(reason) {
        log("Resuming connection for reason: " + reason);
        delete this.interruptReasons_[reason];
        if (util.isEmpty(this.interruptReasons_)) {
          this.reconnectDelay_ = RECONNECT_MIN_DELAY;
          if (!this.realtime_) {
            this.scheduleConnect_(0);
          }
        }
      };
      PersistentConnection2.prototype.handleTimestamp_ = function(timestamp) {
        var delta = timestamp - new Date().getTime();
        this.onServerInfoUpdate_({ serverTimeOffset: delta });
      };
      PersistentConnection2.prototype.cancelSentTransactions_ = function() {
        for (var i = 0; i < this.outstandingPuts_.length; i++) {
          var put = this.outstandingPuts_[i];
          if (put && "h" in put.request && put.queued) {
            if (put.onComplete) {
              put.onComplete("disconnect");
            }
            delete this.outstandingPuts_[i];
            this.outstandingPutCount_--;
          }
        }
        if (this.outstandingPutCount_ === 0) {
          this.outstandingPuts_ = [];
        }
      };
      PersistentConnection2.prototype.onListenRevoked_ = function(pathString, query2) {
        var queryId;
        if (!query2) {
          queryId = "default";
        } else {
          queryId = query2.map(function(q) {
            return ObjectToUniqueKey(q);
          }).join("$");
        }
        var listen = this.removeListen_(pathString, queryId);
        if (listen && listen.onComplete) {
          listen.onComplete("permission_denied");
        }
      };
      PersistentConnection2.prototype.removeListen_ = function(pathString, queryId) {
        var normalizedPathString = new Path(pathString).toString();
        var listen;
        if (this.listens.has(normalizedPathString)) {
          var map = this.listens.get(normalizedPathString);
          listen = map.get(queryId);
          map.delete(queryId);
          if (map.size === 0) {
            this.listens.delete(normalizedPathString);
          }
        } else {
          listen = void 0;
        }
        return listen;
      };
      PersistentConnection2.prototype.onAuthRevoked_ = function(statusCode, explanation) {
        log("Auth token revoked: " + statusCode + "/" + explanation);
        this.authToken_ = null;
        this.forceTokenRefresh_ = true;
        this.realtime_.close();
        if (statusCode === "invalid_token" || statusCode === "permission_denied") {
          this.invalidAuthTokenCount_++;
          if (this.invalidAuthTokenCount_ >= INVALID_TOKEN_THRESHOLD) {
            this.reconnectDelay_ = RECONNECT_MAX_DELAY_FOR_ADMINS;
            this.authTokenProvider_.notifyForInvalidToken();
          }
        }
      };
      PersistentConnection2.prototype.onAppCheckRevoked_ = function(statusCode, explanation) {
        log("App check token revoked: " + statusCode + "/" + explanation);
        this.appCheckToken_ = null;
        this.forceTokenRefresh_ = true;
        if (statusCode === "invalid_token" || statusCode === "permission_denied") {
          this.invalidAppCheckTokenCount_++;
          if (this.invalidAppCheckTokenCount_ >= INVALID_TOKEN_THRESHOLD) {
            this.appCheckTokenProvider_.notifyForInvalidToken();
          }
        }
      };
      PersistentConnection2.prototype.onSecurityDebugPacket_ = function(body) {
        if (this.securityDebugCallback_) {
          this.securityDebugCallback_(body);
        } else {
          if ("msg" in body) {
            console.log("FIREBASE: " + body["msg"].replace("\n", "\nFIREBASE: "));
          }
        }
      };
      PersistentConnection2.prototype.restoreState_ = function() {
        var e_1, _a, e_2, _b;
        this.tryAuth();
        this.tryAppCheck();
        try {
          for (var _c = tslib.__values(this.listens.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var queries = _d.value;
            try {
              for (var _e = (e_2 = void 0, tslib.__values(queries.values())), _f = _e.next(); !_f.done; _f = _e.next()) {
                var listenSpec = _f.value;
                this.sendListen_(listenSpec);
              }
            } catch (e_2_1) {
              e_2 = { error: e_2_1 };
            } finally {
              try {
                if (_f && !_f.done && (_b = _e.return))
                  _b.call(_e);
              } finally {
                if (e_2)
                  throw e_2.error;
              }
            }
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_d && !_d.done && (_a = _c.return))
              _a.call(_c);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
        for (var i = 0; i < this.outstandingPuts_.length; i++) {
          if (this.outstandingPuts_[i]) {
            this.sendPut_(i);
          }
        }
        while (this.onDisconnectRequestQueue_.length) {
          var request = this.onDisconnectRequestQueue_.shift();
          this.sendOnDisconnect_(request.action, request.pathString, request.data, request.onComplete);
        }
        for (var i = 0; i < this.outstandingGets_.length; i++) {
          if (this.outstandingGets_[i]) {
            this.sendGet_(i);
          }
        }
      };
      PersistentConnection2.prototype.sendConnectStats_ = function() {
        var stats2 = {};
        var clientName = "js";
        if (util.isNodeSdk()) {
          if (this.repoInfo_.nodeAdmin) {
            clientName = "admin_node";
          } else {
            clientName = "node";
          }
        }
        stats2["sdk." + clientName + "." + SDK_VERSION.replace(/\./g, "-")] = 1;
        if (util.isMobileCordova()) {
          stats2["framework.cordova"] = 1;
        } else if (util.isReactNative()) {
          stats2["framework.reactnative"] = 1;
        }
        this.reportStats(stats2);
      };
      PersistentConnection2.prototype.shouldReconnect_ = function() {
        var online = OnlineMonitor.getInstance().currentlyOnline();
        return util.isEmpty(this.interruptReasons_) && online;
      };
      PersistentConnection2.nextPersistentConnectionId_ = 0;
      PersistentConnection2.nextConnectionId_ = 0;
      return PersistentConnection2;
    }(ServerActions);
    var NamedNode = function() {
      function NamedNode2(name2, node) {
        this.name = name2;
        this.node = node;
      }
      NamedNode2.Wrap = function(name2, node) {
        return new NamedNode2(name2, node);
      };
      return NamedNode2;
    }();
    var Index = function() {
      function Index2() {
      }
      Index2.prototype.getCompare = function() {
        return this.compare.bind(this);
      };
      Index2.prototype.indexedValueChanged = function(oldNode, newNode) {
        var oldWrapped = new NamedNode(MIN_NAME, oldNode);
        var newWrapped = new NamedNode(MIN_NAME, newNode);
        return this.compare(oldWrapped, newWrapped) !== 0;
      };
      Index2.prototype.minPost = function() {
        return NamedNode.MIN;
      };
      return Index2;
    }();
    var __EMPTY_NODE;
    var KeyIndex = function(_super) {
      tslib.__extends(KeyIndex2, _super);
      function KeyIndex2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      Object.defineProperty(KeyIndex2, "__EMPTY_NODE", {
        get: function() {
          return __EMPTY_NODE;
        },
        set: function(val) {
          __EMPTY_NODE = val;
        },
        enumerable: false,
        configurable: true
      });
      KeyIndex2.prototype.compare = function(a, b) {
        return nameCompare(a.name, b.name);
      };
      KeyIndex2.prototype.isDefinedOn = function(node) {
        throw util.assertionError("KeyIndex.isDefinedOn not expected to be called.");
      };
      KeyIndex2.prototype.indexedValueChanged = function(oldNode, newNode) {
        return false;
      };
      KeyIndex2.prototype.minPost = function() {
        return NamedNode.MIN;
      };
      KeyIndex2.prototype.maxPost = function() {
        return new NamedNode(MAX_NAME, __EMPTY_NODE);
      };
      KeyIndex2.prototype.makePost = function(indexValue, name2) {
        util.assert(typeof indexValue === "string", "KeyIndex indexValue must always be a string.");
        return new NamedNode(indexValue, __EMPTY_NODE);
      };
      KeyIndex2.prototype.toString = function() {
        return ".key";
      };
      return KeyIndex2;
    }(Index);
    var KEY_INDEX = new KeyIndex();
    var SortedMapIterator = function() {
      function SortedMapIterator2(node, startKey, comparator, isReverse_, resultGenerator_) {
        if (resultGenerator_ === void 0) {
          resultGenerator_ = null;
        }
        this.isReverse_ = isReverse_;
        this.resultGenerator_ = resultGenerator_;
        this.nodeStack_ = [];
        var cmp = 1;
        while (!node.isEmpty()) {
          node = node;
          cmp = startKey ? comparator(node.key, startKey) : 1;
          if (isReverse_) {
            cmp *= -1;
          }
          if (cmp < 0) {
            if (this.isReverse_) {
              node = node.left;
            } else {
              node = node.right;
            }
          } else if (cmp === 0) {
            this.nodeStack_.push(node);
            break;
          } else {
            this.nodeStack_.push(node);
            if (this.isReverse_) {
              node = node.right;
            } else {
              node = node.left;
            }
          }
        }
      }
      SortedMapIterator2.prototype.getNext = function() {
        if (this.nodeStack_.length === 0) {
          return null;
        }
        var node = this.nodeStack_.pop();
        var result;
        if (this.resultGenerator_) {
          result = this.resultGenerator_(node.key, node.value);
        } else {
          result = { key: node.key, value: node.value };
        }
        if (this.isReverse_) {
          node = node.left;
          while (!node.isEmpty()) {
            this.nodeStack_.push(node);
            node = node.right;
          }
        } else {
          node = node.right;
          while (!node.isEmpty()) {
            this.nodeStack_.push(node);
            node = node.left;
          }
        }
        return result;
      };
      SortedMapIterator2.prototype.hasNext = function() {
        return this.nodeStack_.length > 0;
      };
      SortedMapIterator2.prototype.peek = function() {
        if (this.nodeStack_.length === 0) {
          return null;
        }
        var node = this.nodeStack_[this.nodeStack_.length - 1];
        if (this.resultGenerator_) {
          return this.resultGenerator_(node.key, node.value);
        } else {
          return { key: node.key, value: node.value };
        }
      };
      return SortedMapIterator2;
    }();
    var LLRBNode = function() {
      function LLRBNode2(key, value, color, left, right) {
        this.key = key;
        this.value = value;
        this.color = color != null ? color : LLRBNode2.RED;
        this.left = left != null ? left : SortedMap.EMPTY_NODE;
        this.right = right != null ? right : SortedMap.EMPTY_NODE;
      }
      LLRBNode2.prototype.copy = function(key, value, color, left, right) {
        return new LLRBNode2(key != null ? key : this.key, value != null ? value : this.value, color != null ? color : this.color, left != null ? left : this.left, right != null ? right : this.right);
      };
      LLRBNode2.prototype.count = function() {
        return this.left.count() + 1 + this.right.count();
      };
      LLRBNode2.prototype.isEmpty = function() {
        return false;
      };
      LLRBNode2.prototype.inorderTraversal = function(action) {
        return this.left.inorderTraversal(action) || !!action(this.key, this.value) || this.right.inorderTraversal(action);
      };
      LLRBNode2.prototype.reverseTraversal = function(action) {
        return this.right.reverseTraversal(action) || action(this.key, this.value) || this.left.reverseTraversal(action);
      };
      LLRBNode2.prototype.min_ = function() {
        if (this.left.isEmpty()) {
          return this;
        } else {
          return this.left.min_();
        }
      };
      LLRBNode2.prototype.minKey = function() {
        return this.min_().key;
      };
      LLRBNode2.prototype.maxKey = function() {
        if (this.right.isEmpty()) {
          return this.key;
        } else {
          return this.right.maxKey();
        }
      };
      LLRBNode2.prototype.insert = function(key, value, comparator) {
        var n = this;
        var cmp = comparator(key, n.key);
        if (cmp < 0) {
          n = n.copy(null, null, null, n.left.insert(key, value, comparator), null);
        } else if (cmp === 0) {
          n = n.copy(null, value, null, null, null);
        } else {
          n = n.copy(null, null, null, null, n.right.insert(key, value, comparator));
        }
        return n.fixUp_();
      };
      LLRBNode2.prototype.removeMin_ = function() {
        if (this.left.isEmpty()) {
          return SortedMap.EMPTY_NODE;
        }
        var n = this;
        if (!n.left.isRed_() && !n.left.left.isRed_()) {
          n = n.moveRedLeft_();
        }
        n = n.copy(null, null, null, n.left.removeMin_(), null);
        return n.fixUp_();
      };
      LLRBNode2.prototype.remove = function(key, comparator) {
        var n, smallest;
        n = this;
        if (comparator(key, n.key) < 0) {
          if (!n.left.isEmpty() && !n.left.isRed_() && !n.left.left.isRed_()) {
            n = n.moveRedLeft_();
          }
          n = n.copy(null, null, null, n.left.remove(key, comparator), null);
        } else {
          if (n.left.isRed_()) {
            n = n.rotateRight_();
          }
          if (!n.right.isEmpty() && !n.right.isRed_() && !n.right.left.isRed_()) {
            n = n.moveRedRight_();
          }
          if (comparator(key, n.key) === 0) {
            if (n.right.isEmpty()) {
              return SortedMap.EMPTY_NODE;
            } else {
              smallest = n.right.min_();
              n = n.copy(smallest.key, smallest.value, null, null, n.right.removeMin_());
            }
          }
          n = n.copy(null, null, null, null, n.right.remove(key, comparator));
        }
        return n.fixUp_();
      };
      LLRBNode2.prototype.isRed_ = function() {
        return this.color;
      };
      LLRBNode2.prototype.fixUp_ = function() {
        var n = this;
        if (n.right.isRed_() && !n.left.isRed_()) {
          n = n.rotateLeft_();
        }
        if (n.left.isRed_() && n.left.left.isRed_()) {
          n = n.rotateRight_();
        }
        if (n.left.isRed_() && n.right.isRed_()) {
          n = n.colorFlip_();
        }
        return n;
      };
      LLRBNode2.prototype.moveRedLeft_ = function() {
        var n = this.colorFlip_();
        if (n.right.left.isRed_()) {
          n = n.copy(null, null, null, null, n.right.rotateRight_());
          n = n.rotateLeft_();
          n = n.colorFlip_();
        }
        return n;
      };
      LLRBNode2.prototype.moveRedRight_ = function() {
        var n = this.colorFlip_();
        if (n.left.left.isRed_()) {
          n = n.rotateRight_();
          n = n.colorFlip_();
        }
        return n;
      };
      LLRBNode2.prototype.rotateLeft_ = function() {
        var nl = this.copy(null, null, LLRBNode2.RED, null, this.right.left);
        return this.right.copy(null, null, this.color, nl, null);
      };
      LLRBNode2.prototype.rotateRight_ = function() {
        var nr = this.copy(null, null, LLRBNode2.RED, this.left.right, null);
        return this.left.copy(null, null, this.color, null, nr);
      };
      LLRBNode2.prototype.colorFlip_ = function() {
        var left = this.left.copy(null, null, !this.left.color, null, null);
        var right = this.right.copy(null, null, !this.right.color, null, null);
        return this.copy(null, null, !this.color, left, right);
      };
      LLRBNode2.prototype.checkMaxDepth_ = function() {
        var blackDepth = this.check_();
        return Math.pow(2, blackDepth) <= this.count() + 1;
      };
      LLRBNode2.prototype.check_ = function() {
        if (this.isRed_() && this.left.isRed_()) {
          throw new Error("Red node has red child(" + this.key + "," + this.value + ")");
        }
        if (this.right.isRed_()) {
          throw new Error("Right child of (" + this.key + "," + this.value + ") is red");
        }
        var blackDepth = this.left.check_();
        if (blackDepth !== this.right.check_()) {
          throw new Error("Black depths differ");
        } else {
          return blackDepth + (this.isRed_() ? 0 : 1);
        }
      };
      LLRBNode2.RED = true;
      LLRBNode2.BLACK = false;
      return LLRBNode2;
    }();
    var LLRBEmptyNode = function() {
      function LLRBEmptyNode2() {
      }
      LLRBEmptyNode2.prototype.copy = function(key, value, color, left, right) {
        return this;
      };
      LLRBEmptyNode2.prototype.insert = function(key, value, comparator) {
        return new LLRBNode(key, value, null);
      };
      LLRBEmptyNode2.prototype.remove = function(key, comparator) {
        return this;
      };
      LLRBEmptyNode2.prototype.count = function() {
        return 0;
      };
      LLRBEmptyNode2.prototype.isEmpty = function() {
        return true;
      };
      LLRBEmptyNode2.prototype.inorderTraversal = function(action) {
        return false;
      };
      LLRBEmptyNode2.prototype.reverseTraversal = function(action) {
        return false;
      };
      LLRBEmptyNode2.prototype.minKey = function() {
        return null;
      };
      LLRBEmptyNode2.prototype.maxKey = function() {
        return null;
      };
      LLRBEmptyNode2.prototype.check_ = function() {
        return 0;
      };
      LLRBEmptyNode2.prototype.isRed_ = function() {
        return false;
      };
      return LLRBEmptyNode2;
    }();
    var SortedMap = function() {
      function SortedMap2(comparator_, root_) {
        if (root_ === void 0) {
          root_ = SortedMap2.EMPTY_NODE;
        }
        this.comparator_ = comparator_;
        this.root_ = root_;
      }
      SortedMap2.prototype.insert = function(key, value) {
        return new SortedMap2(this.comparator_, this.root_.insert(key, value, this.comparator_).copy(null, null, LLRBNode.BLACK, null, null));
      };
      SortedMap2.prototype.remove = function(key) {
        return new SortedMap2(this.comparator_, this.root_.remove(key, this.comparator_).copy(null, null, LLRBNode.BLACK, null, null));
      };
      SortedMap2.prototype.get = function(key) {
        var cmp;
        var node = this.root_;
        while (!node.isEmpty()) {
          cmp = this.comparator_(key, node.key);
          if (cmp === 0) {
            return node.value;
          } else if (cmp < 0) {
            node = node.left;
          } else if (cmp > 0) {
            node = node.right;
          }
        }
        return null;
      };
      SortedMap2.prototype.getPredecessorKey = function(key) {
        var cmp, node = this.root_, rightParent = null;
        while (!node.isEmpty()) {
          cmp = this.comparator_(key, node.key);
          if (cmp === 0) {
            if (!node.left.isEmpty()) {
              node = node.left;
              while (!node.right.isEmpty()) {
                node = node.right;
              }
              return node.key;
            } else if (rightParent) {
              return rightParent.key;
            } else {
              return null;
            }
          } else if (cmp < 0) {
            node = node.left;
          } else if (cmp > 0) {
            rightParent = node;
            node = node.right;
          }
        }
        throw new Error("Attempted to find predecessor key for a nonexistent key.  What gives?");
      };
      SortedMap2.prototype.isEmpty = function() {
        return this.root_.isEmpty();
      };
      SortedMap2.prototype.count = function() {
        return this.root_.count();
      };
      SortedMap2.prototype.minKey = function() {
        return this.root_.minKey();
      };
      SortedMap2.prototype.maxKey = function() {
        return this.root_.maxKey();
      };
      SortedMap2.prototype.inorderTraversal = function(action) {
        return this.root_.inorderTraversal(action);
      };
      SortedMap2.prototype.reverseTraversal = function(action) {
        return this.root_.reverseTraversal(action);
      };
      SortedMap2.prototype.getIterator = function(resultGenerator) {
        return new SortedMapIterator(this.root_, null, this.comparator_, false, resultGenerator);
      };
      SortedMap2.prototype.getIteratorFrom = function(key, resultGenerator) {
        return new SortedMapIterator(this.root_, key, this.comparator_, false, resultGenerator);
      };
      SortedMap2.prototype.getReverseIteratorFrom = function(key, resultGenerator) {
        return new SortedMapIterator(this.root_, key, this.comparator_, true, resultGenerator);
      };
      SortedMap2.prototype.getReverseIterator = function(resultGenerator) {
        return new SortedMapIterator(this.root_, null, this.comparator_, true, resultGenerator);
      };
      SortedMap2.EMPTY_NODE = new LLRBEmptyNode();
      return SortedMap2;
    }();
    function NAME_ONLY_COMPARATOR(left, right) {
      return nameCompare(left.name, right.name);
    }
    function NAME_COMPARATOR(left, right) {
      return nameCompare(left, right);
    }
    var MAX_NODE$2;
    function setMaxNode$1(val) {
      MAX_NODE$2 = val;
    }
    var priorityHashText = function(priority) {
      if (typeof priority === "number") {
        return "number:" + doubleToIEEE754String(priority);
      } else {
        return "string:" + priority;
      }
    };
    var validatePriorityNode = function(priorityNode) {
      if (priorityNode.isLeafNode()) {
        var val = priorityNode.val();
        util.assert(typeof val === "string" || typeof val === "number" || typeof val === "object" && util.contains(val, ".sv"), "Priority must be a string or number.");
      } else {
        util.assert(priorityNode === MAX_NODE$2 || priorityNode.isEmpty(), "priority of unexpected type.");
      }
      util.assert(priorityNode === MAX_NODE$2 || priorityNode.getPriority().isEmpty(), "Priority nodes can't have a priority of their own.");
    };
    var __childrenNodeConstructor;
    var LeafNode = function() {
      function LeafNode2(value_, priorityNode_) {
        if (priorityNode_ === void 0) {
          priorityNode_ = LeafNode2.__childrenNodeConstructor.EMPTY_NODE;
        }
        this.value_ = value_;
        this.priorityNode_ = priorityNode_;
        this.lazyHash_ = null;
        util.assert(this.value_ !== void 0 && this.value_ !== null, "LeafNode shouldn't be created with null/undefined value.");
        validatePriorityNode(this.priorityNode_);
      }
      Object.defineProperty(LeafNode2, "__childrenNodeConstructor", {
        get: function() {
          return __childrenNodeConstructor;
        },
        set: function(val) {
          __childrenNodeConstructor = val;
        },
        enumerable: false,
        configurable: true
      });
      LeafNode2.prototype.isLeafNode = function() {
        return true;
      };
      LeafNode2.prototype.getPriority = function() {
        return this.priorityNode_;
      };
      LeafNode2.prototype.updatePriority = function(newPriorityNode) {
        return new LeafNode2(this.value_, newPriorityNode);
      };
      LeafNode2.prototype.getImmediateChild = function(childName) {
        if (childName === ".priority") {
          return this.priorityNode_;
        } else {
          return LeafNode2.__childrenNodeConstructor.EMPTY_NODE;
        }
      };
      LeafNode2.prototype.getChild = function(path) {
        if (pathIsEmpty(path)) {
          return this;
        } else if (pathGetFront(path) === ".priority") {
          return this.priorityNode_;
        } else {
          return LeafNode2.__childrenNodeConstructor.EMPTY_NODE;
        }
      };
      LeafNode2.prototype.hasChild = function() {
        return false;
      };
      LeafNode2.prototype.getPredecessorChildName = function(childName, childNode) {
        return null;
      };
      LeafNode2.prototype.updateImmediateChild = function(childName, newChildNode) {
        if (childName === ".priority") {
          return this.updatePriority(newChildNode);
        } else if (newChildNode.isEmpty() && childName !== ".priority") {
          return this;
        } else {
          return LeafNode2.__childrenNodeConstructor.EMPTY_NODE.updateImmediateChild(childName, newChildNode).updatePriority(this.priorityNode_);
        }
      };
      LeafNode2.prototype.updateChild = function(path, newChildNode) {
        var front = pathGetFront(path);
        if (front === null) {
          return newChildNode;
        } else if (newChildNode.isEmpty() && front !== ".priority") {
          return this;
        } else {
          util.assert(front !== ".priority" || pathGetLength(path) === 1, ".priority must be the last token in a path");
          return this.updateImmediateChild(front, LeafNode2.__childrenNodeConstructor.EMPTY_NODE.updateChild(pathPopFront(path), newChildNode));
        }
      };
      LeafNode2.prototype.isEmpty = function() {
        return false;
      };
      LeafNode2.prototype.numChildren = function() {
        return 0;
      };
      LeafNode2.prototype.forEachChild = function(index2, action) {
        return false;
      };
      LeafNode2.prototype.val = function(exportFormat) {
        if (exportFormat && !this.getPriority().isEmpty()) {
          return {
            ".value": this.getValue(),
            ".priority": this.getPriority().val()
          };
        } else {
          return this.getValue();
        }
      };
      LeafNode2.prototype.hash = function() {
        if (this.lazyHash_ === null) {
          var toHash = "";
          if (!this.priorityNode_.isEmpty()) {
            toHash += "priority:" + priorityHashText(this.priorityNode_.val()) + ":";
          }
          var type = typeof this.value_;
          toHash += type + ":";
          if (type === "number") {
            toHash += doubleToIEEE754String(this.value_);
          } else {
            toHash += this.value_;
          }
          this.lazyHash_ = sha1(toHash);
        }
        return this.lazyHash_;
      };
      LeafNode2.prototype.getValue = function() {
        return this.value_;
      };
      LeafNode2.prototype.compareTo = function(other) {
        if (other === LeafNode2.__childrenNodeConstructor.EMPTY_NODE) {
          return 1;
        } else if (other instanceof LeafNode2.__childrenNodeConstructor) {
          return -1;
        } else {
          util.assert(other.isLeafNode(), "Unknown node type");
          return this.compareToLeafNode_(other);
        }
      };
      LeafNode2.prototype.compareToLeafNode_ = function(otherLeaf) {
        var otherLeafType = typeof otherLeaf.value_;
        var thisLeafType = typeof this.value_;
        var otherIndex = LeafNode2.VALUE_TYPE_ORDER.indexOf(otherLeafType);
        var thisIndex = LeafNode2.VALUE_TYPE_ORDER.indexOf(thisLeafType);
        util.assert(otherIndex >= 0, "Unknown leaf type: " + otherLeafType);
        util.assert(thisIndex >= 0, "Unknown leaf type: " + thisLeafType);
        if (otherIndex === thisIndex) {
          if (thisLeafType === "object") {
            return 0;
          } else {
            if (this.value_ < otherLeaf.value_) {
              return -1;
            } else if (this.value_ === otherLeaf.value_) {
              return 0;
            } else {
              return 1;
            }
          }
        } else {
          return thisIndex - otherIndex;
        }
      };
      LeafNode2.prototype.withIndex = function() {
        return this;
      };
      LeafNode2.prototype.isIndexed = function() {
        return true;
      };
      LeafNode2.prototype.equals = function(other) {
        if (other === this) {
          return true;
        } else if (other.isLeafNode()) {
          var otherLeaf = other;
          return this.value_ === otherLeaf.value_ && this.priorityNode_.equals(otherLeaf.priorityNode_);
        } else {
          return false;
        }
      };
      LeafNode2.VALUE_TYPE_ORDER = ["object", "boolean", "number", "string"];
      return LeafNode2;
    }();
    var nodeFromJSON$1;
    var MAX_NODE$1;
    function setNodeFromJSON(val) {
      nodeFromJSON$1 = val;
    }
    function setMaxNode(val) {
      MAX_NODE$1 = val;
    }
    var PriorityIndex = function(_super) {
      tslib.__extends(PriorityIndex2, _super);
      function PriorityIndex2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      PriorityIndex2.prototype.compare = function(a, b) {
        var aPriority = a.node.getPriority();
        var bPriority = b.node.getPriority();
        var indexCmp = aPriority.compareTo(bPriority);
        if (indexCmp === 0) {
          return nameCompare(a.name, b.name);
        } else {
          return indexCmp;
        }
      };
      PriorityIndex2.prototype.isDefinedOn = function(node) {
        return !node.getPriority().isEmpty();
      };
      PriorityIndex2.prototype.indexedValueChanged = function(oldNode, newNode) {
        return !oldNode.getPriority().equals(newNode.getPriority());
      };
      PriorityIndex2.prototype.minPost = function() {
        return NamedNode.MIN;
      };
      PriorityIndex2.prototype.maxPost = function() {
        return new NamedNode(MAX_NAME, new LeafNode("[PRIORITY-POST]", MAX_NODE$1));
      };
      PriorityIndex2.prototype.makePost = function(indexValue, name2) {
        var priorityNode = nodeFromJSON$1(indexValue);
        return new NamedNode(name2, new LeafNode("[PRIORITY-POST]", priorityNode));
      };
      PriorityIndex2.prototype.toString = function() {
        return ".priority";
      };
      return PriorityIndex2;
    }(Index);
    var PRIORITY_INDEX = new PriorityIndex();
    var LOG_2 = Math.log(2);
    var Base12Num = function() {
      function Base12Num2(length) {
        var logBase2 = function(num) {
          return parseInt(Math.log(num) / LOG_2, 10);
        };
        var bitMask = function(bits) {
          return parseInt(Array(bits + 1).join("1"), 2);
        };
        this.count = logBase2(length + 1);
        this.current_ = this.count - 1;
        var mask = bitMask(this.count);
        this.bits_ = length + 1 & mask;
      }
      Base12Num2.prototype.nextBitIsOne = function() {
        var result = !(this.bits_ & 1 << this.current_);
        this.current_--;
        return result;
      };
      return Base12Num2;
    }();
    var buildChildSet = function(childList, cmp, keyFn, mapSortFn) {
      childList.sort(cmp);
      var buildBalancedTree = function(low, high) {
        var length = high - low;
        var namedNode;
        var key;
        if (length === 0) {
          return null;
        } else if (length === 1) {
          namedNode = childList[low];
          key = keyFn ? keyFn(namedNode) : namedNode;
          return new LLRBNode(key, namedNode.node, LLRBNode.BLACK, null, null);
        } else {
          var middle = parseInt(length / 2, 10) + low;
          var left = buildBalancedTree(low, middle);
          var right = buildBalancedTree(middle + 1, high);
          namedNode = childList[middle];
          key = keyFn ? keyFn(namedNode) : namedNode;
          return new LLRBNode(key, namedNode.node, LLRBNode.BLACK, left, right);
        }
      };
      var buildFrom12Array = function(base122) {
        var node = null;
        var root2 = null;
        var index2 = childList.length;
        var buildPennant = function(chunkSize2, color) {
          var low = index2 - chunkSize2;
          var high = index2;
          index2 -= chunkSize2;
          var childTree = buildBalancedTree(low + 1, high);
          var namedNode = childList[low];
          var key = keyFn ? keyFn(namedNode) : namedNode;
          attachPennant(new LLRBNode(key, namedNode.node, color, null, childTree));
        };
        var attachPennant = function(pennant) {
          if (node) {
            node.left = pennant;
            node = pennant;
          } else {
            root2 = pennant;
            node = pennant;
          }
        };
        for (var i = 0; i < base122.count; ++i) {
          var isOne = base122.nextBitIsOne();
          var chunkSize = Math.pow(2, base122.count - (i + 1));
          if (isOne) {
            buildPennant(chunkSize, LLRBNode.BLACK);
          } else {
            buildPennant(chunkSize, LLRBNode.BLACK);
            buildPennant(chunkSize, LLRBNode.RED);
          }
        }
        return root2;
      };
      var base12 = new Base12Num(childList.length);
      var root = buildFrom12Array(base12);
      return new SortedMap(mapSortFn || cmp, root);
    };
    var _defaultIndexMap;
    var fallbackObject = {};
    var IndexMap = function() {
      function IndexMap2(indexes_, indexSet_) {
        this.indexes_ = indexes_;
        this.indexSet_ = indexSet_;
      }
      Object.defineProperty(IndexMap2, "Default", {
        get: function() {
          util.assert(fallbackObject && PRIORITY_INDEX, "ChildrenNode.ts has not been loaded");
          _defaultIndexMap = _defaultIndexMap || new IndexMap2({ ".priority": fallbackObject }, { ".priority": PRIORITY_INDEX });
          return _defaultIndexMap;
        },
        enumerable: false,
        configurable: true
      });
      IndexMap2.prototype.get = function(indexKey) {
        var sortedMap = util.safeGet(this.indexes_, indexKey);
        if (!sortedMap) {
          throw new Error("No index defined for " + indexKey);
        }
        if (sortedMap instanceof SortedMap) {
          return sortedMap;
        } else {
          return null;
        }
      };
      IndexMap2.prototype.hasIndex = function(indexDefinition) {
        return util.contains(this.indexSet_, indexDefinition.toString());
      };
      IndexMap2.prototype.addIndex = function(indexDefinition, existingChildren) {
        util.assert(indexDefinition !== KEY_INDEX, "KeyIndex always exists and isn't meant to be added to the IndexMap.");
        var childList = [];
        var sawIndexedValue = false;
        var iter = existingChildren.getIterator(NamedNode.Wrap);
        var next = iter.getNext();
        while (next) {
          sawIndexedValue = sawIndexedValue || indexDefinition.isDefinedOn(next.node);
          childList.push(next);
          next = iter.getNext();
        }
        var newIndex;
        if (sawIndexedValue) {
          newIndex = buildChildSet(childList, indexDefinition.getCompare());
        } else {
          newIndex = fallbackObject;
        }
        var indexName = indexDefinition.toString();
        var newIndexSet = tslib.__assign({}, this.indexSet_);
        newIndexSet[indexName] = indexDefinition;
        var newIndexes = tslib.__assign({}, this.indexes_);
        newIndexes[indexName] = newIndex;
        return new IndexMap2(newIndexes, newIndexSet);
      };
      IndexMap2.prototype.addToIndexes = function(namedNode, existingChildren) {
        var _this = this;
        var newIndexes = util.map(this.indexes_, function(indexedChildren, indexName) {
          var index2 = util.safeGet(_this.indexSet_, indexName);
          util.assert(index2, "Missing index implementation for " + indexName);
          if (indexedChildren === fallbackObject) {
            if (index2.isDefinedOn(namedNode.node)) {
              var childList = [];
              var iter = existingChildren.getIterator(NamedNode.Wrap);
              var next = iter.getNext();
              while (next) {
                if (next.name !== namedNode.name) {
                  childList.push(next);
                }
                next = iter.getNext();
              }
              childList.push(namedNode);
              return buildChildSet(childList, index2.getCompare());
            } else {
              return fallbackObject;
            }
          } else {
            var existingSnap = existingChildren.get(namedNode.name);
            var newChildren = indexedChildren;
            if (existingSnap) {
              newChildren = newChildren.remove(new NamedNode(namedNode.name, existingSnap));
            }
            return newChildren.insert(namedNode, namedNode.node);
          }
        });
        return new IndexMap2(newIndexes, this.indexSet_);
      };
      IndexMap2.prototype.removeFromIndexes = function(namedNode, existingChildren) {
        var newIndexes = util.map(this.indexes_, function(indexedChildren) {
          if (indexedChildren === fallbackObject) {
            return indexedChildren;
          } else {
            var existingSnap = existingChildren.get(namedNode.name);
            if (existingSnap) {
              return indexedChildren.remove(new NamedNode(namedNode.name, existingSnap));
            } else {
              return indexedChildren;
            }
          }
        });
        return new IndexMap2(newIndexes, this.indexSet_);
      };
      return IndexMap2;
    }();
    var EMPTY_NODE;
    var ChildrenNode = function() {
      function ChildrenNode2(children_, priorityNode_, indexMap_) {
        this.children_ = children_;
        this.priorityNode_ = priorityNode_;
        this.indexMap_ = indexMap_;
        this.lazyHash_ = null;
        if (this.priorityNode_) {
          validatePriorityNode(this.priorityNode_);
        }
        if (this.children_.isEmpty()) {
          util.assert(!this.priorityNode_ || this.priorityNode_.isEmpty(), "An empty node cannot have a priority");
        }
      }
      Object.defineProperty(ChildrenNode2, "EMPTY_NODE", {
        get: function() {
          return EMPTY_NODE || (EMPTY_NODE = new ChildrenNode2(new SortedMap(NAME_COMPARATOR), null, IndexMap.Default));
        },
        enumerable: false,
        configurable: true
      });
      ChildrenNode2.prototype.isLeafNode = function() {
        return false;
      };
      ChildrenNode2.prototype.getPriority = function() {
        return this.priorityNode_ || EMPTY_NODE;
      };
      ChildrenNode2.prototype.updatePriority = function(newPriorityNode) {
        if (this.children_.isEmpty()) {
          return this;
        } else {
          return new ChildrenNode2(this.children_, newPriorityNode, this.indexMap_);
        }
      };
      ChildrenNode2.prototype.getImmediateChild = function(childName) {
        if (childName === ".priority") {
          return this.getPriority();
        } else {
          var child2 = this.children_.get(childName);
          return child2 === null ? EMPTY_NODE : child2;
        }
      };
      ChildrenNode2.prototype.getChild = function(path) {
        var front = pathGetFront(path);
        if (front === null) {
          return this;
        }
        return this.getImmediateChild(front).getChild(pathPopFront(path));
      };
      ChildrenNode2.prototype.hasChild = function(childName) {
        return this.children_.get(childName) !== null;
      };
      ChildrenNode2.prototype.updateImmediateChild = function(childName, newChildNode) {
        util.assert(newChildNode, "We should always be passing snapshot nodes");
        if (childName === ".priority") {
          return this.updatePriority(newChildNode);
        } else {
          var namedNode = new NamedNode(childName, newChildNode);
          var newChildren = void 0, newIndexMap = void 0;
          if (newChildNode.isEmpty()) {
            newChildren = this.children_.remove(childName);
            newIndexMap = this.indexMap_.removeFromIndexes(namedNode, this.children_);
          } else {
            newChildren = this.children_.insert(childName, newChildNode);
            newIndexMap = this.indexMap_.addToIndexes(namedNode, this.children_);
          }
          var newPriority = newChildren.isEmpty() ? EMPTY_NODE : this.priorityNode_;
          return new ChildrenNode2(newChildren, newPriority, newIndexMap);
        }
      };
      ChildrenNode2.prototype.updateChild = function(path, newChildNode) {
        var front = pathGetFront(path);
        if (front === null) {
          return newChildNode;
        } else {
          util.assert(pathGetFront(path) !== ".priority" || pathGetLength(path) === 1, ".priority must be the last token in a path");
          var newImmediateChild = this.getImmediateChild(front).updateChild(pathPopFront(path), newChildNode);
          return this.updateImmediateChild(front, newImmediateChild);
        }
      };
      ChildrenNode2.prototype.isEmpty = function() {
        return this.children_.isEmpty();
      };
      ChildrenNode2.prototype.numChildren = function() {
        return this.children_.count();
      };
      ChildrenNode2.prototype.val = function(exportFormat) {
        if (this.isEmpty()) {
          return null;
        }
        var obj = {};
        var numKeys = 0, maxKey = 0, allIntegerKeys = true;
        this.forEachChild(PRIORITY_INDEX, function(key2, childNode) {
          obj[key2] = childNode.val(exportFormat);
          numKeys++;
          if (allIntegerKeys && ChildrenNode2.INTEGER_REGEXP_.test(key2)) {
            maxKey = Math.max(maxKey, Number(key2));
          } else {
            allIntegerKeys = false;
          }
        });
        if (!exportFormat && allIntegerKeys && maxKey < 2 * numKeys) {
          var array = [];
          for (var key in obj) {
            array[key] = obj[key];
          }
          return array;
        } else {
          if (exportFormat && !this.getPriority().isEmpty()) {
            obj[".priority"] = this.getPriority().val();
          }
          return obj;
        }
      };
      ChildrenNode2.prototype.hash = function() {
        if (this.lazyHash_ === null) {
          var toHash_1 = "";
          if (!this.getPriority().isEmpty()) {
            toHash_1 += "priority:" + priorityHashText(this.getPriority().val()) + ":";
          }
          this.forEachChild(PRIORITY_INDEX, function(key, childNode) {
            var childHash = childNode.hash();
            if (childHash !== "") {
              toHash_1 += ":" + key + ":" + childHash;
            }
          });
          this.lazyHash_ = toHash_1 === "" ? "" : sha1(toHash_1);
        }
        return this.lazyHash_;
      };
      ChildrenNode2.prototype.getPredecessorChildName = function(childName, childNode, index2) {
        var idx = this.resolveIndex_(index2);
        if (idx) {
          var predecessor2 = idx.getPredecessorKey(new NamedNode(childName, childNode));
          return predecessor2 ? predecessor2.name : null;
        } else {
          return this.children_.getPredecessorKey(childName);
        }
      };
      ChildrenNode2.prototype.getFirstChildName = function(indexDefinition) {
        var idx = this.resolveIndex_(indexDefinition);
        if (idx) {
          var minKey = idx.minKey();
          return minKey && minKey.name;
        } else {
          return this.children_.minKey();
        }
      };
      ChildrenNode2.prototype.getFirstChild = function(indexDefinition) {
        var minKey = this.getFirstChildName(indexDefinition);
        if (minKey) {
          return new NamedNode(minKey, this.children_.get(minKey));
        } else {
          return null;
        }
      };
      ChildrenNode2.prototype.getLastChildName = function(indexDefinition) {
        var idx = this.resolveIndex_(indexDefinition);
        if (idx) {
          var maxKey = idx.maxKey();
          return maxKey && maxKey.name;
        } else {
          return this.children_.maxKey();
        }
      };
      ChildrenNode2.prototype.getLastChild = function(indexDefinition) {
        var maxKey = this.getLastChildName(indexDefinition);
        if (maxKey) {
          return new NamedNode(maxKey, this.children_.get(maxKey));
        } else {
          return null;
        }
      };
      ChildrenNode2.prototype.forEachChild = function(index2, action) {
        var idx = this.resolveIndex_(index2);
        if (idx) {
          return idx.inorderTraversal(function(wrappedNode) {
            return action(wrappedNode.name, wrappedNode.node);
          });
        } else {
          return this.children_.inorderTraversal(action);
        }
      };
      ChildrenNode2.prototype.getIterator = function(indexDefinition) {
        return this.getIteratorFrom(indexDefinition.minPost(), indexDefinition);
      };
      ChildrenNode2.prototype.getIteratorFrom = function(startPost, indexDefinition) {
        var idx = this.resolveIndex_(indexDefinition);
        if (idx) {
          return idx.getIteratorFrom(startPost, function(key) {
            return key;
          });
        } else {
          var iterator = this.children_.getIteratorFrom(startPost.name, NamedNode.Wrap);
          var next = iterator.peek();
          while (next != null && indexDefinition.compare(next, startPost) < 0) {
            iterator.getNext();
            next = iterator.peek();
          }
          return iterator;
        }
      };
      ChildrenNode2.prototype.getReverseIterator = function(indexDefinition) {
        return this.getReverseIteratorFrom(indexDefinition.maxPost(), indexDefinition);
      };
      ChildrenNode2.prototype.getReverseIteratorFrom = function(endPost, indexDefinition) {
        var idx = this.resolveIndex_(indexDefinition);
        if (idx) {
          return idx.getReverseIteratorFrom(endPost, function(key) {
            return key;
          });
        } else {
          var iterator = this.children_.getReverseIteratorFrom(endPost.name, NamedNode.Wrap);
          var next = iterator.peek();
          while (next != null && indexDefinition.compare(next, endPost) > 0) {
            iterator.getNext();
            next = iterator.peek();
          }
          return iterator;
        }
      };
      ChildrenNode2.prototype.compareTo = function(other) {
        if (this.isEmpty()) {
          if (other.isEmpty()) {
            return 0;
          } else {
            return -1;
          }
        } else if (other.isLeafNode() || other.isEmpty()) {
          return 1;
        } else if (other === MAX_NODE) {
          return -1;
        } else {
          return 0;
        }
      };
      ChildrenNode2.prototype.withIndex = function(indexDefinition) {
        if (indexDefinition === KEY_INDEX || this.indexMap_.hasIndex(indexDefinition)) {
          return this;
        } else {
          var newIndexMap = this.indexMap_.addIndex(indexDefinition, this.children_);
          return new ChildrenNode2(this.children_, this.priorityNode_, newIndexMap);
        }
      };
      ChildrenNode2.prototype.isIndexed = function(index2) {
        return index2 === KEY_INDEX || this.indexMap_.hasIndex(index2);
      };
      ChildrenNode2.prototype.equals = function(other) {
        if (other === this) {
          return true;
        } else if (other.isLeafNode()) {
          return false;
        } else {
          var otherChildrenNode = other;
          if (!this.getPriority().equals(otherChildrenNode.getPriority())) {
            return false;
          } else if (this.children_.count() === otherChildrenNode.children_.count()) {
            var thisIter = this.getIterator(PRIORITY_INDEX);
            var otherIter = otherChildrenNode.getIterator(PRIORITY_INDEX);
            var thisCurrent = thisIter.getNext();
            var otherCurrent = otherIter.getNext();
            while (thisCurrent && otherCurrent) {
              if (thisCurrent.name !== otherCurrent.name || !thisCurrent.node.equals(otherCurrent.node)) {
                return false;
              }
              thisCurrent = thisIter.getNext();
              otherCurrent = otherIter.getNext();
            }
            return thisCurrent === null && otherCurrent === null;
          } else {
            return false;
          }
        }
      };
      ChildrenNode2.prototype.resolveIndex_ = function(indexDefinition) {
        if (indexDefinition === KEY_INDEX) {
          return null;
        } else {
          return this.indexMap_.get(indexDefinition.toString());
        }
      };
      ChildrenNode2.INTEGER_REGEXP_ = /^(0|[1-9]\d*)$/;
      return ChildrenNode2;
    }();
    var MaxNode = function(_super) {
      tslib.__extends(MaxNode2, _super);
      function MaxNode2() {
        return _super.call(this, new SortedMap(NAME_COMPARATOR), ChildrenNode.EMPTY_NODE, IndexMap.Default) || this;
      }
      MaxNode2.prototype.compareTo = function(other) {
        if (other === this) {
          return 0;
        } else {
          return 1;
        }
      };
      MaxNode2.prototype.equals = function(other) {
        return other === this;
      };
      MaxNode2.prototype.getPriority = function() {
        return this;
      };
      MaxNode2.prototype.getImmediateChild = function(childName) {
        return ChildrenNode.EMPTY_NODE;
      };
      MaxNode2.prototype.isEmpty = function() {
        return false;
      };
      return MaxNode2;
    }(ChildrenNode);
    var MAX_NODE = new MaxNode();
    Object.defineProperties(NamedNode, {
      MIN: {
        value: new NamedNode(MIN_NAME, ChildrenNode.EMPTY_NODE)
      },
      MAX: {
        value: new NamedNode(MAX_NAME, MAX_NODE)
      }
    });
    KeyIndex.__EMPTY_NODE = ChildrenNode.EMPTY_NODE;
    LeafNode.__childrenNodeConstructor = ChildrenNode;
    setMaxNode$1(MAX_NODE);
    setMaxNode(MAX_NODE);
    var USE_HINZE = true;
    function nodeFromJSON(json, priority) {
      if (priority === void 0) {
        priority = null;
      }
      if (json === null) {
        return ChildrenNode.EMPTY_NODE;
      }
      if (typeof json === "object" && ".priority" in json) {
        priority = json[".priority"];
      }
      util.assert(priority === null || typeof priority === "string" || typeof priority === "number" || typeof priority === "object" && ".sv" in priority, "Invalid priority type found: " + typeof priority);
      if (typeof json === "object" && ".value" in json && json[".value"] !== null) {
        json = json[".value"];
      }
      if (typeof json !== "object" || ".sv" in json) {
        var jsonLeaf = json;
        return new LeafNode(jsonLeaf, nodeFromJSON(priority));
      }
      if (!(json instanceof Array) && USE_HINZE) {
        var children_1 = [];
        var childrenHavePriority_1 = false;
        var hinzeJsonObj = json;
        each(hinzeJsonObj, function(key, child2) {
          if (key.substring(0, 1) !== ".") {
            var childNode = nodeFromJSON(child2);
            if (!childNode.isEmpty()) {
              childrenHavePriority_1 = childrenHavePriority_1 || !childNode.getPriority().isEmpty();
              children_1.push(new NamedNode(key, childNode));
            }
          }
        });
        if (children_1.length === 0) {
          return ChildrenNode.EMPTY_NODE;
        }
        var childSet = buildChildSet(children_1, NAME_ONLY_COMPARATOR, function(namedNode) {
          return namedNode.name;
        }, NAME_COMPARATOR);
        if (childrenHavePriority_1) {
          var sortedChildSet = buildChildSet(children_1, PRIORITY_INDEX.getCompare());
          return new ChildrenNode(childSet, nodeFromJSON(priority), new IndexMap({ ".priority": sortedChildSet }, { ".priority": PRIORITY_INDEX }));
        } else {
          return new ChildrenNode(childSet, nodeFromJSON(priority), IndexMap.Default);
        }
      } else {
        var node_1 = ChildrenNode.EMPTY_NODE;
        each(json, function(key, childData) {
          if (util.contains(json, key)) {
            if (key.substring(0, 1) !== ".") {
              var childNode = nodeFromJSON(childData);
              if (childNode.isLeafNode() || !childNode.isEmpty()) {
                node_1 = node_1.updateImmediateChild(key, childNode);
              }
            }
          }
        });
        return node_1.updatePriority(nodeFromJSON(priority));
      }
    }
    setNodeFromJSON(nodeFromJSON);
    var PathIndex = function(_super) {
      tslib.__extends(PathIndex2, _super);
      function PathIndex2(indexPath_) {
        var _this = _super.call(this) || this;
        _this.indexPath_ = indexPath_;
        util.assert(!pathIsEmpty(indexPath_) && pathGetFront(indexPath_) !== ".priority", "Can't create PathIndex with empty path or .priority key");
        return _this;
      }
      PathIndex2.prototype.extractChild = function(snap) {
        return snap.getChild(this.indexPath_);
      };
      PathIndex2.prototype.isDefinedOn = function(node) {
        return !node.getChild(this.indexPath_).isEmpty();
      };
      PathIndex2.prototype.compare = function(a, b) {
        var aChild = this.extractChild(a.node);
        var bChild = this.extractChild(b.node);
        var indexCmp = aChild.compareTo(bChild);
        if (indexCmp === 0) {
          return nameCompare(a.name, b.name);
        } else {
          return indexCmp;
        }
      };
      PathIndex2.prototype.makePost = function(indexValue, name2) {
        var valueNode = nodeFromJSON(indexValue);
        var node = ChildrenNode.EMPTY_NODE.updateChild(this.indexPath_, valueNode);
        return new NamedNode(name2, node);
      };
      PathIndex2.prototype.maxPost = function() {
        var node = ChildrenNode.EMPTY_NODE.updateChild(this.indexPath_, MAX_NODE);
        return new NamedNode(MAX_NAME, node);
      };
      PathIndex2.prototype.toString = function() {
        return pathSlice(this.indexPath_, 0).join("/");
      };
      return PathIndex2;
    }(Index);
    var ValueIndex = function(_super) {
      tslib.__extends(ValueIndex2, _super);
      function ValueIndex2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      ValueIndex2.prototype.compare = function(a, b) {
        var indexCmp = a.node.compareTo(b.node);
        if (indexCmp === 0) {
          return nameCompare(a.name, b.name);
        } else {
          return indexCmp;
        }
      };
      ValueIndex2.prototype.isDefinedOn = function(node) {
        return true;
      };
      ValueIndex2.prototype.indexedValueChanged = function(oldNode, newNode) {
        return !oldNode.equals(newNode);
      };
      ValueIndex2.prototype.minPost = function() {
        return NamedNode.MIN;
      };
      ValueIndex2.prototype.maxPost = function() {
        return NamedNode.MAX;
      };
      ValueIndex2.prototype.makePost = function(indexValue, name2) {
        var valueNode = nodeFromJSON(indexValue);
        return new NamedNode(name2, valueNode);
      };
      ValueIndex2.prototype.toString = function() {
        return ".value";
      };
      return ValueIndex2;
    }(Index);
    var VALUE_INDEX = new ValueIndex();
    var PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
    var MIN_PUSH_CHAR = "-";
    var MAX_PUSH_CHAR = "z";
    var MAX_KEY_LEN = 786;
    var nextPushId = function() {
      var lastPushTime = 0;
      var lastRandChars = [];
      return function(now) {
        var duplicateTime = now === lastPushTime;
        lastPushTime = now;
        var i;
        var timeStampChars = new Array(8);
        for (i = 7; i >= 0; i--) {
          timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
          now = Math.floor(now / 64);
        }
        util.assert(now === 0, "Cannot push at time == 0");
        var id = timeStampChars.join("");
        if (!duplicateTime) {
          for (i = 0; i < 12; i++) {
            lastRandChars[i] = Math.floor(Math.random() * 64);
          }
        } else {
          for (i = 11; i >= 0 && lastRandChars[i] === 63; i--) {
            lastRandChars[i] = 0;
          }
          lastRandChars[i]++;
        }
        for (i = 0; i < 12; i++) {
          id += PUSH_CHARS.charAt(lastRandChars[i]);
        }
        util.assert(id.length === 20, "nextPushId: Length should be 20.");
        return id;
      };
    }();
    var successor = function(key) {
      if (key === "" + INTEGER_32_MAX) {
        return MIN_PUSH_CHAR;
      }
      var keyAsInt = tryParseInt(key);
      if (keyAsInt != null) {
        return "" + (keyAsInt + 1);
      }
      var next = new Array(key.length);
      for (var i_1 = 0; i_1 < next.length; i_1++) {
        next[i_1] = key.charAt(i_1);
      }
      if (next.length < MAX_KEY_LEN) {
        next.push(MIN_PUSH_CHAR);
        return next.join("");
      }
      var i = next.length - 1;
      while (i >= 0 && next[i] === MAX_PUSH_CHAR) {
        i--;
      }
      if (i === -1) {
        return MAX_NAME;
      }
      var source = next[i];
      var sourcePlusOne = PUSH_CHARS.charAt(PUSH_CHARS.indexOf(source) + 1);
      next[i] = sourcePlusOne;
      return next.slice(0, i + 1).join("");
    };
    var predecessor = function(key) {
      if (key === "" + INTEGER_32_MIN) {
        return MIN_NAME;
      }
      var keyAsInt = tryParseInt(key);
      if (keyAsInt != null) {
        return "" + (keyAsInt - 1);
      }
      var next = new Array(key.length);
      for (var i = 0; i < next.length; i++) {
        next[i] = key.charAt(i);
      }
      if (next[next.length - 1] === MIN_PUSH_CHAR) {
        if (next.length === 1) {
          return "" + INTEGER_32_MAX;
        }
        delete next[next.length - 1];
        return next.join("");
      }
      next[next.length - 1] = PUSH_CHARS.charAt(PUSH_CHARS.indexOf(next[next.length - 1]) - 1);
      return next.join("") + MAX_PUSH_CHAR.repeat(MAX_KEY_LEN - next.length);
    };
    function changeValue(snapshotNode) {
      return { type: "value", snapshotNode };
    }
    function changeChildAdded(childName, snapshotNode) {
      return { type: "child_added", snapshotNode, childName };
    }
    function changeChildRemoved(childName, snapshotNode) {
      return { type: "child_removed", snapshotNode, childName };
    }
    function changeChildChanged(childName, snapshotNode, oldSnap) {
      return {
        type: "child_changed",
        snapshotNode,
        childName,
        oldSnap
      };
    }
    function changeChildMoved(childName, snapshotNode) {
      return { type: "child_moved", snapshotNode, childName };
    }
    var IndexedFilter = function() {
      function IndexedFilter2(index_) {
        this.index_ = index_;
      }
      IndexedFilter2.prototype.updateChild = function(snap, key, newChild, affectedPath, source, optChangeAccumulator) {
        util.assert(snap.isIndexed(this.index_), "A node must be indexed if only a child is updated");
        var oldChild = snap.getImmediateChild(key);
        if (oldChild.getChild(affectedPath).equals(newChild.getChild(affectedPath))) {
          if (oldChild.isEmpty() === newChild.isEmpty()) {
            return snap;
          }
        }
        if (optChangeAccumulator != null) {
          if (newChild.isEmpty()) {
            if (snap.hasChild(key)) {
              optChangeAccumulator.trackChildChange(changeChildRemoved(key, oldChild));
            } else {
              util.assert(snap.isLeafNode(), "A child remove without an old child only makes sense on a leaf node");
            }
          } else if (oldChild.isEmpty()) {
            optChangeAccumulator.trackChildChange(changeChildAdded(key, newChild));
          } else {
            optChangeAccumulator.trackChildChange(changeChildChanged(key, newChild, oldChild));
          }
        }
        if (snap.isLeafNode() && newChild.isEmpty()) {
          return snap;
        } else {
          return snap.updateImmediateChild(key, newChild).withIndex(this.index_);
        }
      };
      IndexedFilter2.prototype.updateFullNode = function(oldSnap, newSnap, optChangeAccumulator) {
        if (optChangeAccumulator != null) {
          if (!oldSnap.isLeafNode()) {
            oldSnap.forEachChild(PRIORITY_INDEX, function(key, childNode) {
              if (!newSnap.hasChild(key)) {
                optChangeAccumulator.trackChildChange(changeChildRemoved(key, childNode));
              }
            });
          }
          if (!newSnap.isLeafNode()) {
            newSnap.forEachChild(PRIORITY_INDEX, function(key, childNode) {
              if (oldSnap.hasChild(key)) {
                var oldChild = oldSnap.getImmediateChild(key);
                if (!oldChild.equals(childNode)) {
                  optChangeAccumulator.trackChildChange(changeChildChanged(key, childNode, oldChild));
                }
              } else {
                optChangeAccumulator.trackChildChange(changeChildAdded(key, childNode));
              }
            });
          }
        }
        return newSnap.withIndex(this.index_);
      };
      IndexedFilter2.prototype.updatePriority = function(oldSnap, newPriority) {
        if (oldSnap.isEmpty()) {
          return ChildrenNode.EMPTY_NODE;
        } else {
          return oldSnap.updatePriority(newPriority);
        }
      };
      IndexedFilter2.prototype.filtersNodes = function() {
        return false;
      };
      IndexedFilter2.prototype.getIndexedFilter = function() {
        return this;
      };
      IndexedFilter2.prototype.getIndex = function() {
        return this.index_;
      };
      return IndexedFilter2;
    }();
    var RangedFilter = function() {
      function RangedFilter2(params) {
        this.indexedFilter_ = new IndexedFilter(params.getIndex());
        this.index_ = params.getIndex();
        this.startPost_ = RangedFilter2.getStartPost_(params);
        this.endPost_ = RangedFilter2.getEndPost_(params);
      }
      RangedFilter2.prototype.getStartPost = function() {
        return this.startPost_;
      };
      RangedFilter2.prototype.getEndPost = function() {
        return this.endPost_;
      };
      RangedFilter2.prototype.matches = function(node) {
        return this.index_.compare(this.getStartPost(), node) <= 0 && this.index_.compare(node, this.getEndPost()) <= 0;
      };
      RangedFilter2.prototype.updateChild = function(snap, key, newChild, affectedPath, source, optChangeAccumulator) {
        if (!this.matches(new NamedNode(key, newChild))) {
          newChild = ChildrenNode.EMPTY_NODE;
        }
        return this.indexedFilter_.updateChild(snap, key, newChild, affectedPath, source, optChangeAccumulator);
      };
      RangedFilter2.prototype.updateFullNode = function(oldSnap, newSnap, optChangeAccumulator) {
        if (newSnap.isLeafNode()) {
          newSnap = ChildrenNode.EMPTY_NODE;
        }
        var filtered = newSnap.withIndex(this.index_);
        filtered = filtered.updatePriority(ChildrenNode.EMPTY_NODE);
        var self2 = this;
        newSnap.forEachChild(PRIORITY_INDEX, function(key, childNode) {
          if (!self2.matches(new NamedNode(key, childNode))) {
            filtered = filtered.updateImmediateChild(key, ChildrenNode.EMPTY_NODE);
          }
        });
        return this.indexedFilter_.updateFullNode(oldSnap, filtered, optChangeAccumulator);
      };
      RangedFilter2.prototype.updatePriority = function(oldSnap, newPriority) {
        return oldSnap;
      };
      RangedFilter2.prototype.filtersNodes = function() {
        return true;
      };
      RangedFilter2.prototype.getIndexedFilter = function() {
        return this.indexedFilter_;
      };
      RangedFilter2.prototype.getIndex = function() {
        return this.index_;
      };
      RangedFilter2.getStartPost_ = function(params) {
        if (params.hasStart()) {
          var startName = params.getIndexStartName();
          return params.getIndex().makePost(params.getIndexStartValue(), startName);
        } else {
          return params.getIndex().minPost();
        }
      };
      RangedFilter2.getEndPost_ = function(params) {
        if (params.hasEnd()) {
          var endName = params.getIndexEndName();
          return params.getIndex().makePost(params.getIndexEndValue(), endName);
        } else {
          return params.getIndex().maxPost();
        }
      };
      return RangedFilter2;
    }();
    var LimitedFilter = function() {
      function LimitedFilter2(params) {
        this.rangedFilter_ = new RangedFilter(params);
        this.index_ = params.getIndex();
        this.limit_ = params.getLimit();
        this.reverse_ = !params.isViewFromLeft();
      }
      LimitedFilter2.prototype.updateChild = function(snap, key, newChild, affectedPath, source, optChangeAccumulator) {
        if (!this.rangedFilter_.matches(new NamedNode(key, newChild))) {
          newChild = ChildrenNode.EMPTY_NODE;
        }
        if (snap.getImmediateChild(key).equals(newChild)) {
          return snap;
        } else if (snap.numChildren() < this.limit_) {
          return this.rangedFilter_.getIndexedFilter().updateChild(snap, key, newChild, affectedPath, source, optChangeAccumulator);
        } else {
          return this.fullLimitUpdateChild_(snap, key, newChild, source, optChangeAccumulator);
        }
      };
      LimitedFilter2.prototype.updateFullNode = function(oldSnap, newSnap, optChangeAccumulator) {
        var filtered;
        if (newSnap.isLeafNode() || newSnap.isEmpty()) {
          filtered = ChildrenNode.EMPTY_NODE.withIndex(this.index_);
        } else {
          if (this.limit_ * 2 < newSnap.numChildren() && newSnap.isIndexed(this.index_)) {
            filtered = ChildrenNode.EMPTY_NODE.withIndex(this.index_);
            var iterator = void 0;
            if (this.reverse_) {
              iterator = newSnap.getReverseIteratorFrom(this.rangedFilter_.getEndPost(), this.index_);
            } else {
              iterator = newSnap.getIteratorFrom(this.rangedFilter_.getStartPost(), this.index_);
            }
            var count = 0;
            while (iterator.hasNext() && count < this.limit_) {
              var next = iterator.getNext();
              var inRange = void 0;
              if (this.reverse_) {
                inRange = this.index_.compare(this.rangedFilter_.getStartPost(), next) <= 0;
              } else {
                inRange = this.index_.compare(next, this.rangedFilter_.getEndPost()) <= 0;
              }
              if (inRange) {
                filtered = filtered.updateImmediateChild(next.name, next.node);
                count++;
              } else {
                break;
              }
            }
          } else {
            filtered = newSnap.withIndex(this.index_);
            filtered = filtered.updatePriority(ChildrenNode.EMPTY_NODE);
            var startPost = void 0;
            var endPost = void 0;
            var cmp = void 0;
            var iterator = void 0;
            if (this.reverse_) {
              iterator = filtered.getReverseIterator(this.index_);
              startPost = this.rangedFilter_.getEndPost();
              endPost = this.rangedFilter_.getStartPost();
              var indexCompare_1 = this.index_.getCompare();
              cmp = function(a, b) {
                return indexCompare_1(b, a);
              };
            } else {
              iterator = filtered.getIterator(this.index_);
              startPost = this.rangedFilter_.getStartPost();
              endPost = this.rangedFilter_.getEndPost();
              cmp = this.index_.getCompare();
            }
            var count = 0;
            var foundStartPost = false;
            while (iterator.hasNext()) {
              var next = iterator.getNext();
              if (!foundStartPost && cmp(startPost, next) <= 0) {
                foundStartPost = true;
              }
              var inRange = foundStartPost && count < this.limit_ && cmp(next, endPost) <= 0;
              if (inRange) {
                count++;
              } else {
                filtered = filtered.updateImmediateChild(next.name, ChildrenNode.EMPTY_NODE);
              }
            }
          }
        }
        return this.rangedFilter_.getIndexedFilter().updateFullNode(oldSnap, filtered, optChangeAccumulator);
      };
      LimitedFilter2.prototype.updatePriority = function(oldSnap, newPriority) {
        return oldSnap;
      };
      LimitedFilter2.prototype.filtersNodes = function() {
        return true;
      };
      LimitedFilter2.prototype.getIndexedFilter = function() {
        return this.rangedFilter_.getIndexedFilter();
      };
      LimitedFilter2.prototype.getIndex = function() {
        return this.index_;
      };
      LimitedFilter2.prototype.fullLimitUpdateChild_ = function(snap, childKey, childSnap, source, changeAccumulator) {
        var cmp;
        if (this.reverse_) {
          var indexCmp_1 = this.index_.getCompare();
          cmp = function(a, b) {
            return indexCmp_1(b, a);
          };
        } else {
          cmp = this.index_.getCompare();
        }
        var oldEventCache = snap;
        util.assert(oldEventCache.numChildren() === this.limit_, "");
        var newChildNamedNode = new NamedNode(childKey, childSnap);
        var windowBoundary = this.reverse_ ? oldEventCache.getFirstChild(this.index_) : oldEventCache.getLastChild(this.index_);
        var inRange = this.rangedFilter_.matches(newChildNamedNode);
        if (oldEventCache.hasChild(childKey)) {
          var oldChildSnap = oldEventCache.getImmediateChild(childKey);
          var nextChild = source.getChildAfterChild(this.index_, windowBoundary, this.reverse_);
          while (nextChild != null && (nextChild.name === childKey || oldEventCache.hasChild(nextChild.name))) {
            nextChild = source.getChildAfterChild(this.index_, nextChild, this.reverse_);
          }
          var compareNext = nextChild == null ? 1 : cmp(nextChild, newChildNamedNode);
          var remainsInWindow = inRange && !childSnap.isEmpty() && compareNext >= 0;
          if (remainsInWindow) {
            if (changeAccumulator != null) {
              changeAccumulator.trackChildChange(changeChildChanged(childKey, childSnap, oldChildSnap));
            }
            return oldEventCache.updateImmediateChild(childKey, childSnap);
          } else {
            if (changeAccumulator != null) {
              changeAccumulator.trackChildChange(changeChildRemoved(childKey, oldChildSnap));
            }
            var newEventCache = oldEventCache.updateImmediateChild(childKey, ChildrenNode.EMPTY_NODE);
            var nextChildInRange = nextChild != null && this.rangedFilter_.matches(nextChild);
            if (nextChildInRange) {
              if (changeAccumulator != null) {
                changeAccumulator.trackChildChange(changeChildAdded(nextChild.name, nextChild.node));
              }
              return newEventCache.updateImmediateChild(nextChild.name, nextChild.node);
            } else {
              return newEventCache;
            }
          }
        } else if (childSnap.isEmpty()) {
          return snap;
        } else if (inRange) {
          if (cmp(windowBoundary, newChildNamedNode) >= 0) {
            if (changeAccumulator != null) {
              changeAccumulator.trackChildChange(changeChildRemoved(windowBoundary.name, windowBoundary.node));
              changeAccumulator.trackChildChange(changeChildAdded(childKey, childSnap));
            }
            return oldEventCache.updateImmediateChild(childKey, childSnap).updateImmediateChild(windowBoundary.name, ChildrenNode.EMPTY_NODE);
          } else {
            return snap;
          }
        } else {
          return snap;
        }
      };
      return LimitedFilter2;
    }();
    var QueryParams = function() {
      function QueryParams2() {
        this.limitSet_ = false;
        this.startSet_ = false;
        this.startNameSet_ = false;
        this.startAfterSet_ = false;
        this.endSet_ = false;
        this.endNameSet_ = false;
        this.endBeforeSet_ = false;
        this.limit_ = 0;
        this.viewFrom_ = "";
        this.indexStartValue_ = null;
        this.indexStartName_ = "";
        this.indexEndValue_ = null;
        this.indexEndName_ = "";
        this.index_ = PRIORITY_INDEX;
      }
      QueryParams2.prototype.hasStart = function() {
        return this.startSet_;
      };
      QueryParams2.prototype.hasStartAfter = function() {
        return this.startAfterSet_;
      };
      QueryParams2.prototype.hasEndBefore = function() {
        return this.endBeforeSet_;
      };
      QueryParams2.prototype.isViewFromLeft = function() {
        if (this.viewFrom_ === "") {
          return this.startSet_;
        } else {
          return this.viewFrom_ === "l";
        }
      };
      QueryParams2.prototype.getIndexStartValue = function() {
        util.assert(this.startSet_, "Only valid if start has been set");
        return this.indexStartValue_;
      };
      QueryParams2.prototype.getIndexStartName = function() {
        util.assert(this.startSet_, "Only valid if start has been set");
        if (this.startNameSet_) {
          return this.indexStartName_;
        } else {
          return MIN_NAME;
        }
      };
      QueryParams2.prototype.hasEnd = function() {
        return this.endSet_;
      };
      QueryParams2.prototype.getIndexEndValue = function() {
        util.assert(this.endSet_, "Only valid if end has been set");
        return this.indexEndValue_;
      };
      QueryParams2.prototype.getIndexEndName = function() {
        util.assert(this.endSet_, "Only valid if end has been set");
        if (this.endNameSet_) {
          return this.indexEndName_;
        } else {
          return MAX_NAME;
        }
      };
      QueryParams2.prototype.hasLimit = function() {
        return this.limitSet_;
      };
      QueryParams2.prototype.hasAnchoredLimit = function() {
        return this.limitSet_ && this.viewFrom_ !== "";
      };
      QueryParams2.prototype.getLimit = function() {
        util.assert(this.limitSet_, "Only valid if limit has been set");
        return this.limit_;
      };
      QueryParams2.prototype.getIndex = function() {
        return this.index_;
      };
      QueryParams2.prototype.loadsAllData = function() {
        return !(this.startSet_ || this.endSet_ || this.limitSet_);
      };
      QueryParams2.prototype.isDefault = function() {
        return this.loadsAllData() && this.index_ === PRIORITY_INDEX;
      };
      QueryParams2.prototype.copy = function() {
        var copy = new QueryParams2();
        copy.limitSet_ = this.limitSet_;
        copy.limit_ = this.limit_;
        copy.startSet_ = this.startSet_;
        copy.indexStartValue_ = this.indexStartValue_;
        copy.startNameSet_ = this.startNameSet_;
        copy.indexStartName_ = this.indexStartName_;
        copy.endSet_ = this.endSet_;
        copy.indexEndValue_ = this.indexEndValue_;
        copy.endNameSet_ = this.endNameSet_;
        copy.indexEndName_ = this.indexEndName_;
        copy.index_ = this.index_;
        copy.viewFrom_ = this.viewFrom_;
        return copy;
      };
      return QueryParams2;
    }();
    function queryParamsGetNodeFilter(queryParams) {
      if (queryParams.loadsAllData()) {
        return new IndexedFilter(queryParams.getIndex());
      } else if (queryParams.hasLimit()) {
        return new LimitedFilter(queryParams);
      } else {
        return new RangedFilter(queryParams);
      }
    }
    function queryParamsLimitToFirst(queryParams, newLimit) {
      var newParams = queryParams.copy();
      newParams.limitSet_ = true;
      newParams.limit_ = newLimit;
      newParams.viewFrom_ = "l";
      return newParams;
    }
    function queryParamsLimitToLast(queryParams, newLimit) {
      var newParams = queryParams.copy();
      newParams.limitSet_ = true;
      newParams.limit_ = newLimit;
      newParams.viewFrom_ = "r";
      return newParams;
    }
    function queryParamsStartAt(queryParams, indexValue, key) {
      var newParams = queryParams.copy();
      newParams.startSet_ = true;
      if (indexValue === void 0) {
        indexValue = null;
      }
      newParams.indexStartValue_ = indexValue;
      if (key != null) {
        newParams.startNameSet_ = true;
        newParams.indexStartName_ = key;
      } else {
        newParams.startNameSet_ = false;
        newParams.indexStartName_ = "";
      }
      return newParams;
    }
    function queryParamsStartAfter(queryParams, indexValue, key) {
      var params;
      if (queryParams.index_ === KEY_INDEX) {
        if (typeof indexValue === "string") {
          indexValue = successor(indexValue);
        }
        params = queryParamsStartAt(queryParams, indexValue, key);
      } else {
        var childKey = void 0;
        if (key == null) {
          childKey = MAX_NAME;
        } else {
          childKey = successor(key);
        }
        params = queryParamsStartAt(queryParams, indexValue, childKey);
      }
      params.startAfterSet_ = true;
      return params;
    }
    function queryParamsEndAt(queryParams, indexValue, key) {
      var newParams = queryParams.copy();
      newParams.endSet_ = true;
      if (indexValue === void 0) {
        indexValue = null;
      }
      newParams.indexEndValue_ = indexValue;
      if (key !== void 0) {
        newParams.endNameSet_ = true;
        newParams.indexEndName_ = key;
      } else {
        newParams.endNameSet_ = false;
        newParams.indexEndName_ = "";
      }
      return newParams;
    }
    function queryParamsEndBefore(queryParams, indexValue, key) {
      var childKey;
      var params;
      if (queryParams.index_ === KEY_INDEX) {
        if (typeof indexValue === "string") {
          indexValue = predecessor(indexValue);
        }
        params = queryParamsEndAt(queryParams, indexValue, key);
      } else {
        if (key == null) {
          childKey = MIN_NAME;
        } else {
          childKey = predecessor(key);
        }
        params = queryParamsEndAt(queryParams, indexValue, childKey);
      }
      params.endBeforeSet_ = true;
      return params;
    }
    function queryParamsOrderBy(queryParams, index2) {
      var newParams = queryParams.copy();
      newParams.index_ = index2;
      return newParams;
    }
    function queryParamsToRestQueryStringParameters(queryParams) {
      var qs = {};
      if (queryParams.isDefault()) {
        return qs;
      }
      var orderBy;
      if (queryParams.index_ === PRIORITY_INDEX) {
        orderBy = "$priority";
      } else if (queryParams.index_ === VALUE_INDEX) {
        orderBy = "$value";
      } else if (queryParams.index_ === KEY_INDEX) {
        orderBy = "$key";
      } else {
        util.assert(queryParams.index_ instanceof PathIndex, "Unrecognized index type!");
        orderBy = queryParams.index_.toString();
      }
      qs["orderBy"] = util.stringify(orderBy);
      if (queryParams.startSet_) {
        qs["startAt"] = util.stringify(queryParams.indexStartValue_);
        if (queryParams.startNameSet_) {
          qs["startAt"] += "," + util.stringify(queryParams.indexStartName_);
        }
      }
      if (queryParams.endSet_) {
        qs["endAt"] = util.stringify(queryParams.indexEndValue_);
        if (queryParams.endNameSet_) {
          qs["endAt"] += "," + util.stringify(queryParams.indexEndName_);
        }
      }
      if (queryParams.limitSet_) {
        if (queryParams.isViewFromLeft()) {
          qs["limitToFirst"] = queryParams.limit_;
        } else {
          qs["limitToLast"] = queryParams.limit_;
        }
      }
      return qs;
    }
    function queryParamsGetQueryObject(queryParams) {
      var obj = {};
      if (queryParams.startSet_) {
        obj["sp"] = queryParams.indexStartValue_;
        if (queryParams.startNameSet_) {
          obj["sn"] = queryParams.indexStartName_;
        }
      }
      if (queryParams.endSet_) {
        obj["ep"] = queryParams.indexEndValue_;
        if (queryParams.endNameSet_) {
          obj["en"] = queryParams.indexEndName_;
        }
      }
      if (queryParams.limitSet_) {
        obj["l"] = queryParams.limit_;
        var viewFrom = queryParams.viewFrom_;
        if (viewFrom === "") {
          if (queryParams.isViewFromLeft()) {
            viewFrom = "l";
          } else {
            viewFrom = "r";
          }
        }
        obj["vf"] = viewFrom;
      }
      if (queryParams.index_ !== PRIORITY_INDEX) {
        obj["i"] = queryParams.index_.toString();
      }
      return obj;
    }
    var ReadonlyRestClient = function(_super) {
      tslib.__extends(ReadonlyRestClient2, _super);
      function ReadonlyRestClient2(repoInfo_, onDataUpdate_, authTokenProvider_, appCheckTokenProvider_) {
        var _this = _super.call(this) || this;
        _this.repoInfo_ = repoInfo_;
        _this.onDataUpdate_ = onDataUpdate_;
        _this.authTokenProvider_ = authTokenProvider_;
        _this.appCheckTokenProvider_ = appCheckTokenProvider_;
        _this.log_ = logWrapper("p:rest:");
        _this.listens_ = {};
        return _this;
      }
      ReadonlyRestClient2.prototype.reportStats = function(stats2) {
        throw new Error("Method not implemented.");
      };
      ReadonlyRestClient2.getListenId_ = function(query2, tag) {
        if (tag !== void 0) {
          return "tag$" + tag;
        } else {
          util.assert(query2._queryParams.isDefault(), "should have a tag if it's not a default query.");
          return query2._path.toString();
        }
      };
      ReadonlyRestClient2.prototype.listen = function(query2, currentHashFn, tag, onComplete) {
        var _this = this;
        var pathString = query2._path.toString();
        this.log_("Listen called for " + pathString + " " + query2._queryIdentifier);
        var listenId = ReadonlyRestClient2.getListenId_(query2, tag);
        var thisListen = {};
        this.listens_[listenId] = thisListen;
        var queryStringParameters = queryParamsToRestQueryStringParameters(query2._queryParams);
        this.restRequest_(pathString + ".json", queryStringParameters, function(error4, result) {
          var data = result;
          if (error4 === 404) {
            data = null;
            error4 = null;
          }
          if (error4 === null) {
            _this.onDataUpdate_(pathString, data, false, tag);
          }
          if (util.safeGet(_this.listens_, listenId) === thisListen) {
            var status_1;
            if (!error4) {
              status_1 = "ok";
            } else if (error4 === 401) {
              status_1 = "permission_denied";
            } else {
              status_1 = "rest_error:" + error4;
            }
            onComplete(status_1, null);
          }
        });
      };
      ReadonlyRestClient2.prototype.unlisten = function(query2, tag) {
        var listenId = ReadonlyRestClient2.getListenId_(query2, tag);
        delete this.listens_[listenId];
      };
      ReadonlyRestClient2.prototype.get = function(query2) {
        var _this = this;
        var queryStringParameters = queryParamsToRestQueryStringParameters(query2._queryParams);
        var pathString = query2._path.toString();
        var deferred = new util.Deferred();
        this.restRequest_(pathString + ".json", queryStringParameters, function(error4, result) {
          var data = result;
          if (error4 === 404) {
            data = null;
            error4 = null;
          }
          if (error4 === null) {
            _this.onDataUpdate_(pathString, data, false, null);
            deferred.resolve(data);
          } else {
            deferred.reject(new Error(data));
          }
        });
        return deferred.promise;
      };
      ReadonlyRestClient2.prototype.refreshAuthToken = function(token) {
      };
      ReadonlyRestClient2.prototype.restRequest_ = function(pathString, queryStringParameters, callback) {
        var _this = this;
        if (queryStringParameters === void 0) {
          queryStringParameters = {};
        }
        queryStringParameters["format"] = "export";
        return Promise.all([
          this.authTokenProvider_.getToken(false),
          this.appCheckTokenProvider_.getToken(false)
        ]).then(function(_a) {
          var _b = tslib.__read(_a, 2), authToken = _b[0], appCheckToken = _b[1];
          if (authToken && authToken.accessToken) {
            queryStringParameters["auth"] = authToken.accessToken;
          }
          if (appCheckToken && appCheckToken.token) {
            queryStringParameters["ac"] = appCheckToken.token;
          }
          var url = (_this.repoInfo_.secure ? "https://" : "http://") + _this.repoInfo_.host + pathString + "?ns=" + _this.repoInfo_.namespace + util.querystring(queryStringParameters);
          _this.log_("Sending REST request for " + url);
          var xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
            if (callback && xhr.readyState === 4) {
              _this.log_("REST Response for " + url + " received. status:", xhr.status, "response:", xhr.responseText);
              var res = null;
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  res = util.jsonEval(xhr.responseText);
                } catch (e) {
                  warn("Failed to parse JSON response for " + url + ": " + xhr.responseText);
                }
                callback(null, res);
              } else {
                if (xhr.status !== 401 && xhr.status !== 404) {
                  warn("Got unsuccessful REST response for " + url + " Status: " + xhr.status);
                }
                callback(xhr.status);
              }
              callback = null;
            }
          };
          xhr.open("GET", url, true);
          xhr.send();
        });
      };
      return ReadonlyRestClient2;
    }(ServerActions);
    var SnapshotHolder = function() {
      function SnapshotHolder2() {
        this.rootNode_ = ChildrenNode.EMPTY_NODE;
      }
      SnapshotHolder2.prototype.getNode = function(path) {
        return this.rootNode_.getChild(path);
      };
      SnapshotHolder2.prototype.updateSnapshot = function(path, newSnapshotNode) {
        this.rootNode_ = this.rootNode_.updateChild(path, newSnapshotNode);
      };
      return SnapshotHolder2;
    }();
    function newSparseSnapshotTree() {
      return {
        value: null,
        children: new Map()
      };
    }
    function sparseSnapshotTreeRemember(sparseSnapshotTree, path, data) {
      if (pathIsEmpty(path)) {
        sparseSnapshotTree.value = data;
        sparseSnapshotTree.children.clear();
      } else if (sparseSnapshotTree.value !== null) {
        sparseSnapshotTree.value = sparseSnapshotTree.value.updateChild(path, data);
      } else {
        var childKey = pathGetFront(path);
        if (!sparseSnapshotTree.children.has(childKey)) {
          sparseSnapshotTree.children.set(childKey, newSparseSnapshotTree());
        }
        var child2 = sparseSnapshotTree.children.get(childKey);
        path = pathPopFront(path);
        sparseSnapshotTreeRemember(child2, path, data);
      }
    }
    function sparseSnapshotTreeForget(sparseSnapshotTree, path) {
      if (pathIsEmpty(path)) {
        sparseSnapshotTree.value = null;
        sparseSnapshotTree.children.clear();
        return true;
      } else {
        if (sparseSnapshotTree.value !== null) {
          if (sparseSnapshotTree.value.isLeafNode()) {
            return false;
          } else {
            var value = sparseSnapshotTree.value;
            sparseSnapshotTree.value = null;
            value.forEachChild(PRIORITY_INDEX, function(key, tree) {
              sparseSnapshotTreeRemember(sparseSnapshotTree, new Path(key), tree);
            });
            return sparseSnapshotTreeForget(sparseSnapshotTree, path);
          }
        } else if (sparseSnapshotTree.children.size > 0) {
          var childKey = pathGetFront(path);
          path = pathPopFront(path);
          if (sparseSnapshotTree.children.has(childKey)) {
            var safeToRemove = sparseSnapshotTreeForget(sparseSnapshotTree.children.get(childKey), path);
            if (safeToRemove) {
              sparseSnapshotTree.children.delete(childKey);
            }
          }
          return sparseSnapshotTree.children.size === 0;
        } else {
          return true;
        }
      }
    }
    function sparseSnapshotTreeForEachTree(sparseSnapshotTree, prefixPath, func) {
      if (sparseSnapshotTree.value !== null) {
        func(prefixPath, sparseSnapshotTree.value);
      } else {
        sparseSnapshotTreeForEachChild(sparseSnapshotTree, function(key, tree) {
          var path = new Path(prefixPath.toString() + "/" + key);
          sparseSnapshotTreeForEachTree(tree, path, func);
        });
      }
    }
    function sparseSnapshotTreeForEachChild(sparseSnapshotTree, func) {
      sparseSnapshotTree.children.forEach(function(tree, key) {
        func(key, tree);
      });
    }
    var StatsListener = function() {
      function StatsListener2(collection_) {
        this.collection_ = collection_;
        this.last_ = null;
      }
      StatsListener2.prototype.get = function() {
        var newStats = this.collection_.get();
        var delta = tslib.__assign({}, newStats);
        if (this.last_) {
          each(this.last_, function(stat, value) {
            delta[stat] = delta[stat] - value;
          });
        }
        this.last_ = newStats;
        return delta;
      };
      return StatsListener2;
    }();
    var FIRST_STATS_MIN_TIME = 10 * 1e3;
    var FIRST_STATS_MAX_TIME = 30 * 1e3;
    var REPORT_STATS_INTERVAL = 5 * 60 * 1e3;
    var StatsReporter = function() {
      function StatsReporter2(collection, server_) {
        this.server_ = server_;
        this.statsToReport_ = {};
        this.statsListener_ = new StatsListener(collection);
        var timeout = FIRST_STATS_MIN_TIME + (FIRST_STATS_MAX_TIME - FIRST_STATS_MIN_TIME) * Math.random();
        setTimeoutNonBlocking(this.reportStats_.bind(this), Math.floor(timeout));
      }
      StatsReporter2.prototype.reportStats_ = function() {
        var _this = this;
        var stats2 = this.statsListener_.get();
        var reportedStats = {};
        var haveStatsToReport = false;
        each(stats2, function(stat, value) {
          if (value > 0 && util.contains(_this.statsToReport_, stat)) {
            reportedStats[stat] = value;
            haveStatsToReport = true;
          }
        });
        if (haveStatsToReport) {
          this.server_.reportStats(reportedStats);
        }
        setTimeoutNonBlocking(this.reportStats_.bind(this), Math.floor(Math.random() * 2 * REPORT_STATS_INTERVAL));
      };
      return StatsReporter2;
    }();
    function statsReporterIncludeStat(reporter, stat) {
      reporter.statsToReport_[stat] = true;
    }
    var OperationType;
    (function(OperationType2) {
      OperationType2[OperationType2["OVERWRITE"] = 0] = "OVERWRITE";
      OperationType2[OperationType2["MERGE"] = 1] = "MERGE";
      OperationType2[OperationType2["ACK_USER_WRITE"] = 2] = "ACK_USER_WRITE";
      OperationType2[OperationType2["LISTEN_COMPLETE"] = 3] = "LISTEN_COMPLETE";
    })(OperationType || (OperationType = {}));
    function newOperationSourceUser() {
      return {
        fromUser: true,
        fromServer: false,
        queryId: null,
        tagged: false
      };
    }
    function newOperationSourceServer() {
      return {
        fromUser: false,
        fromServer: true,
        queryId: null,
        tagged: false
      };
    }
    function newOperationSourceServerTaggedQuery(queryId) {
      return {
        fromUser: false,
        fromServer: true,
        queryId,
        tagged: true
      };
    }
    var AckUserWrite = function() {
      function AckUserWrite2(path, affectedTree, revert) {
        this.path = path;
        this.affectedTree = affectedTree;
        this.revert = revert;
        this.type = OperationType.ACK_USER_WRITE;
        this.source = newOperationSourceUser();
      }
      AckUserWrite2.prototype.operationForChild = function(childName) {
        if (!pathIsEmpty(this.path)) {
          util.assert(pathGetFront(this.path) === childName, "operationForChild called for unrelated child.");
          return new AckUserWrite2(pathPopFront(this.path), this.affectedTree, this.revert);
        } else if (this.affectedTree.value != null) {
          util.assert(this.affectedTree.children.isEmpty(), "affectedTree should not have overlapping affected paths.");
          return this;
        } else {
          var childTree = this.affectedTree.subtree(new Path(childName));
          return new AckUserWrite2(newEmptyPath(), childTree, this.revert);
        }
      };
      return AckUserWrite2;
    }();
    var ListenComplete = function() {
      function ListenComplete2(source, path) {
        this.source = source;
        this.path = path;
        this.type = OperationType.LISTEN_COMPLETE;
      }
      ListenComplete2.prototype.operationForChild = function(childName) {
        if (pathIsEmpty(this.path)) {
          return new ListenComplete2(this.source, newEmptyPath());
        } else {
          return new ListenComplete2(this.source, pathPopFront(this.path));
        }
      };
      return ListenComplete2;
    }();
    var Overwrite = function() {
      function Overwrite2(source, path, snap) {
        this.source = source;
        this.path = path;
        this.snap = snap;
        this.type = OperationType.OVERWRITE;
      }
      Overwrite2.prototype.operationForChild = function(childName) {
        if (pathIsEmpty(this.path)) {
          return new Overwrite2(this.source, newEmptyPath(), this.snap.getImmediateChild(childName));
        } else {
          return new Overwrite2(this.source, pathPopFront(this.path), this.snap);
        }
      };
      return Overwrite2;
    }();
    var Merge = function() {
      function Merge2(source, path, children) {
        this.source = source;
        this.path = path;
        this.children = children;
        this.type = OperationType.MERGE;
      }
      Merge2.prototype.operationForChild = function(childName) {
        if (pathIsEmpty(this.path)) {
          var childTree = this.children.subtree(new Path(childName));
          if (childTree.isEmpty()) {
            return null;
          } else if (childTree.value) {
            return new Overwrite(this.source, newEmptyPath(), childTree.value);
          } else {
            return new Merge2(this.source, newEmptyPath(), childTree);
          }
        } else {
          util.assert(pathGetFront(this.path) === childName, "Can't get a merge for a child not on the path of the operation");
          return new Merge2(this.source, pathPopFront(this.path), this.children);
        }
      };
      Merge2.prototype.toString = function() {
        return "Operation(" + this.path + ": " + this.source.toString() + " merge: " + this.children.toString() + ")";
      };
      return Merge2;
    }();
    var CacheNode = function() {
      function CacheNode2(node_, fullyInitialized_, filtered_) {
        this.node_ = node_;
        this.fullyInitialized_ = fullyInitialized_;
        this.filtered_ = filtered_;
      }
      CacheNode2.prototype.isFullyInitialized = function() {
        return this.fullyInitialized_;
      };
      CacheNode2.prototype.isFiltered = function() {
        return this.filtered_;
      };
      CacheNode2.prototype.isCompleteForPath = function(path) {
        if (pathIsEmpty(path)) {
          return this.isFullyInitialized() && !this.filtered_;
        }
        var childKey = pathGetFront(path);
        return this.isCompleteForChild(childKey);
      };
      CacheNode2.prototype.isCompleteForChild = function(key) {
        return this.isFullyInitialized() && !this.filtered_ || this.node_.hasChild(key);
      };
      CacheNode2.prototype.getNode = function() {
        return this.node_;
      };
      return CacheNode2;
    }();
    var EventGenerator = function() {
      function EventGenerator2(query_) {
        this.query_ = query_;
        this.index_ = this.query_._queryParams.getIndex();
      }
      return EventGenerator2;
    }();
    function eventGeneratorGenerateEventsForChanges(eventGenerator, changes, eventCache, eventRegistrations) {
      var events = [];
      var moves = [];
      changes.forEach(function(change) {
        if (change.type === "child_changed" && eventGenerator.index_.indexedValueChanged(change.oldSnap, change.snapshotNode)) {
          moves.push(changeChildMoved(change.childName, change.snapshotNode));
        }
      });
      eventGeneratorGenerateEventsForType(eventGenerator, events, "child_removed", changes, eventRegistrations, eventCache);
      eventGeneratorGenerateEventsForType(eventGenerator, events, "child_added", changes, eventRegistrations, eventCache);
      eventGeneratorGenerateEventsForType(eventGenerator, events, "child_moved", moves, eventRegistrations, eventCache);
      eventGeneratorGenerateEventsForType(eventGenerator, events, "child_changed", changes, eventRegistrations, eventCache);
      eventGeneratorGenerateEventsForType(eventGenerator, events, "value", changes, eventRegistrations, eventCache);
      return events;
    }
    function eventGeneratorGenerateEventsForType(eventGenerator, events, eventType, changes, registrations, eventCache) {
      var filteredChanges = changes.filter(function(change) {
        return change.type === eventType;
      });
      filteredChanges.sort(function(a, b) {
        return eventGeneratorCompareChanges(eventGenerator, a, b);
      });
      filteredChanges.forEach(function(change) {
        var materializedChange = eventGeneratorMaterializeSingleChange(eventGenerator, change, eventCache);
        registrations.forEach(function(registration) {
          if (registration.respondsTo(change.type)) {
            events.push(registration.createEvent(materializedChange, eventGenerator.query_));
          }
        });
      });
    }
    function eventGeneratorMaterializeSingleChange(eventGenerator, change, eventCache) {
      if (change.type === "value" || change.type === "child_removed") {
        return change;
      } else {
        change.prevName = eventCache.getPredecessorChildName(change.childName, change.snapshotNode, eventGenerator.index_);
        return change;
      }
    }
    function eventGeneratorCompareChanges(eventGenerator, a, b) {
      if (a.childName == null || b.childName == null) {
        throw util.assertionError("Should only compare child_ events.");
      }
      var aWrapped = new NamedNode(a.childName, a.snapshotNode);
      var bWrapped = new NamedNode(b.childName, b.snapshotNode);
      return eventGenerator.index_.compare(aWrapped, bWrapped);
    }
    function newViewCache(eventCache, serverCache) {
      return { eventCache, serverCache };
    }
    function viewCacheUpdateEventSnap(viewCache, eventSnap, complete, filtered) {
      return newViewCache(new CacheNode(eventSnap, complete, filtered), viewCache.serverCache);
    }
    function viewCacheUpdateServerSnap(viewCache, serverSnap, complete, filtered) {
      return newViewCache(viewCache.eventCache, new CacheNode(serverSnap, complete, filtered));
    }
    function viewCacheGetCompleteEventSnap(viewCache) {
      return viewCache.eventCache.isFullyInitialized() ? viewCache.eventCache.getNode() : null;
    }
    function viewCacheGetCompleteServerSnap(viewCache) {
      return viewCache.serverCache.isFullyInitialized() ? viewCache.serverCache.getNode() : null;
    }
    var emptyChildrenSingleton;
    var EmptyChildren = function() {
      if (!emptyChildrenSingleton) {
        emptyChildrenSingleton = new SortedMap(stringCompare);
      }
      return emptyChildrenSingleton;
    };
    var ImmutableTree = function() {
      function ImmutableTree2(value, children) {
        if (children === void 0) {
          children = EmptyChildren();
        }
        this.value = value;
        this.children = children;
      }
      ImmutableTree2.fromObject = function(obj) {
        var tree = new ImmutableTree2(null);
        each(obj, function(childPath, childSnap) {
          tree = tree.set(new Path(childPath), childSnap);
        });
        return tree;
      };
      ImmutableTree2.prototype.isEmpty = function() {
        return this.value === null && this.children.isEmpty();
      };
      ImmutableTree2.prototype.findRootMostMatchingPathAndValue = function(relativePath, predicate) {
        if (this.value != null && predicate(this.value)) {
          return { path: newEmptyPath(), value: this.value };
        } else {
          if (pathIsEmpty(relativePath)) {
            return null;
          } else {
            var front = pathGetFront(relativePath);
            var child2 = this.children.get(front);
            if (child2 !== null) {
              var childExistingPathAndValue = child2.findRootMostMatchingPathAndValue(pathPopFront(relativePath), predicate);
              if (childExistingPathAndValue != null) {
                var fullPath = pathChild(new Path(front), childExistingPathAndValue.path);
                return { path: fullPath, value: childExistingPathAndValue.value };
              } else {
                return null;
              }
            } else {
              return null;
            }
          }
        }
      };
      ImmutableTree2.prototype.findRootMostValueAndPath = function(relativePath) {
        return this.findRootMostMatchingPathAndValue(relativePath, function() {
          return true;
        });
      };
      ImmutableTree2.prototype.subtree = function(relativePath) {
        if (pathIsEmpty(relativePath)) {
          return this;
        } else {
          var front = pathGetFront(relativePath);
          var childTree = this.children.get(front);
          if (childTree !== null) {
            return childTree.subtree(pathPopFront(relativePath));
          } else {
            return new ImmutableTree2(null);
          }
        }
      };
      ImmutableTree2.prototype.set = function(relativePath, toSet) {
        if (pathIsEmpty(relativePath)) {
          return new ImmutableTree2(toSet, this.children);
        } else {
          var front = pathGetFront(relativePath);
          var child2 = this.children.get(front) || new ImmutableTree2(null);
          var newChild = child2.set(pathPopFront(relativePath), toSet);
          var newChildren = this.children.insert(front, newChild);
          return new ImmutableTree2(this.value, newChildren);
        }
      };
      ImmutableTree2.prototype.remove = function(relativePath) {
        if (pathIsEmpty(relativePath)) {
          if (this.children.isEmpty()) {
            return new ImmutableTree2(null);
          } else {
            return new ImmutableTree2(null, this.children);
          }
        } else {
          var front = pathGetFront(relativePath);
          var child2 = this.children.get(front);
          if (child2) {
            var newChild = child2.remove(pathPopFront(relativePath));
            var newChildren = void 0;
            if (newChild.isEmpty()) {
              newChildren = this.children.remove(front);
            } else {
              newChildren = this.children.insert(front, newChild);
            }
            if (this.value === null && newChildren.isEmpty()) {
              return new ImmutableTree2(null);
            } else {
              return new ImmutableTree2(this.value, newChildren);
            }
          } else {
            return this;
          }
        }
      };
      ImmutableTree2.prototype.get = function(relativePath) {
        if (pathIsEmpty(relativePath)) {
          return this.value;
        } else {
          var front = pathGetFront(relativePath);
          var child2 = this.children.get(front);
          if (child2) {
            return child2.get(pathPopFront(relativePath));
          } else {
            return null;
          }
        }
      };
      ImmutableTree2.prototype.setTree = function(relativePath, newTree) {
        if (pathIsEmpty(relativePath)) {
          return newTree;
        } else {
          var front = pathGetFront(relativePath);
          var child2 = this.children.get(front) || new ImmutableTree2(null);
          var newChild = child2.setTree(pathPopFront(relativePath), newTree);
          var newChildren = void 0;
          if (newChild.isEmpty()) {
            newChildren = this.children.remove(front);
          } else {
            newChildren = this.children.insert(front, newChild);
          }
          return new ImmutableTree2(this.value, newChildren);
        }
      };
      ImmutableTree2.prototype.fold = function(fn) {
        return this.fold_(newEmptyPath(), fn);
      };
      ImmutableTree2.prototype.fold_ = function(pathSoFar, fn) {
        var accum = {};
        this.children.inorderTraversal(function(childKey, childTree) {
          accum[childKey] = childTree.fold_(pathChild(pathSoFar, childKey), fn);
        });
        return fn(pathSoFar, this.value, accum);
      };
      ImmutableTree2.prototype.findOnPath = function(path, f) {
        return this.findOnPath_(path, newEmptyPath(), f);
      };
      ImmutableTree2.prototype.findOnPath_ = function(pathToFollow, pathSoFar, f) {
        var result = this.value ? f(pathSoFar, this.value) : false;
        if (result) {
          return result;
        } else {
          if (pathIsEmpty(pathToFollow)) {
            return null;
          } else {
            var front = pathGetFront(pathToFollow);
            var nextChild = this.children.get(front);
            if (nextChild) {
              return nextChild.findOnPath_(pathPopFront(pathToFollow), pathChild(pathSoFar, front), f);
            } else {
              return null;
            }
          }
        }
      };
      ImmutableTree2.prototype.foreachOnPath = function(path, f) {
        return this.foreachOnPath_(path, newEmptyPath(), f);
      };
      ImmutableTree2.prototype.foreachOnPath_ = function(pathToFollow, currentRelativePath, f) {
        if (pathIsEmpty(pathToFollow)) {
          return this;
        } else {
          if (this.value) {
            f(currentRelativePath, this.value);
          }
          var front = pathGetFront(pathToFollow);
          var nextChild = this.children.get(front);
          if (nextChild) {
            return nextChild.foreachOnPath_(pathPopFront(pathToFollow), pathChild(currentRelativePath, front), f);
          } else {
            return new ImmutableTree2(null);
          }
        }
      };
      ImmutableTree2.prototype.foreach = function(f) {
        this.foreach_(newEmptyPath(), f);
      };
      ImmutableTree2.prototype.foreach_ = function(currentRelativePath, f) {
        this.children.inorderTraversal(function(childName, childTree) {
          childTree.foreach_(pathChild(currentRelativePath, childName), f);
        });
        if (this.value) {
          f(currentRelativePath, this.value);
        }
      };
      ImmutableTree2.prototype.foreachChild = function(f) {
        this.children.inorderTraversal(function(childName, childTree) {
          if (childTree.value) {
            f(childName, childTree.value);
          }
        });
      };
      return ImmutableTree2;
    }();
    var CompoundWrite = function() {
      function CompoundWrite2(writeTree_) {
        this.writeTree_ = writeTree_;
      }
      CompoundWrite2.empty = function() {
        return new CompoundWrite2(new ImmutableTree(null));
      };
      return CompoundWrite2;
    }();
    function compoundWriteAddWrite(compoundWrite, path, node) {
      if (pathIsEmpty(path)) {
        return new CompoundWrite(new ImmutableTree(node));
      } else {
        var rootmost = compoundWrite.writeTree_.findRootMostValueAndPath(path);
        if (rootmost != null) {
          var rootMostPath = rootmost.path;
          var value = rootmost.value;
          var relativePath = newRelativePath(rootMostPath, path);
          value = value.updateChild(relativePath, node);
          return new CompoundWrite(compoundWrite.writeTree_.set(rootMostPath, value));
        } else {
          var subtree = new ImmutableTree(node);
          var newWriteTree2 = compoundWrite.writeTree_.setTree(path, subtree);
          return new CompoundWrite(newWriteTree2);
        }
      }
    }
    function compoundWriteAddWrites(compoundWrite, path, updates) {
      var newWrite = compoundWrite;
      each(updates, function(childKey, node) {
        newWrite = compoundWriteAddWrite(newWrite, pathChild(path, childKey), node);
      });
      return newWrite;
    }
    function compoundWriteRemoveWrite(compoundWrite, path) {
      if (pathIsEmpty(path)) {
        return CompoundWrite.empty();
      } else {
        var newWriteTree2 = compoundWrite.writeTree_.setTree(path, new ImmutableTree(null));
        return new CompoundWrite(newWriteTree2);
      }
    }
    function compoundWriteHasCompleteWrite(compoundWrite, path) {
      return compoundWriteGetCompleteNode(compoundWrite, path) != null;
    }
    function compoundWriteGetCompleteNode(compoundWrite, path) {
      var rootmost = compoundWrite.writeTree_.findRootMostValueAndPath(path);
      if (rootmost != null) {
        return compoundWrite.writeTree_.get(rootmost.path).getChild(newRelativePath(rootmost.path, path));
      } else {
        return null;
      }
    }
    function compoundWriteGetCompleteChildren(compoundWrite) {
      var children = [];
      var node = compoundWrite.writeTree_.value;
      if (node != null) {
        if (!node.isLeafNode()) {
          node.forEachChild(PRIORITY_INDEX, function(childName, childNode) {
            children.push(new NamedNode(childName, childNode));
          });
        }
      } else {
        compoundWrite.writeTree_.children.inorderTraversal(function(childName, childTree) {
          if (childTree.value != null) {
            children.push(new NamedNode(childName, childTree.value));
          }
        });
      }
      return children;
    }
    function compoundWriteChildCompoundWrite(compoundWrite, path) {
      if (pathIsEmpty(path)) {
        return compoundWrite;
      } else {
        var shadowingNode = compoundWriteGetCompleteNode(compoundWrite, path);
        if (shadowingNode != null) {
          return new CompoundWrite(new ImmutableTree(shadowingNode));
        } else {
          return new CompoundWrite(compoundWrite.writeTree_.subtree(path));
        }
      }
    }
    function compoundWriteIsEmpty(compoundWrite) {
      return compoundWrite.writeTree_.isEmpty();
    }
    function compoundWriteApply(compoundWrite, node) {
      return applySubtreeWrite(newEmptyPath(), compoundWrite.writeTree_, node);
    }
    function applySubtreeWrite(relativePath, writeTree, node) {
      if (writeTree.value != null) {
        return node.updateChild(relativePath, writeTree.value);
      } else {
        var priorityWrite_1 = null;
        writeTree.children.inorderTraversal(function(childKey, childTree) {
          if (childKey === ".priority") {
            util.assert(childTree.value !== null, "Priority writes must always be leaf nodes");
            priorityWrite_1 = childTree.value;
          } else {
            node = applySubtreeWrite(pathChild(relativePath, childKey), childTree, node);
          }
        });
        if (!node.getChild(relativePath).isEmpty() && priorityWrite_1 !== null) {
          node = node.updateChild(pathChild(relativePath, ".priority"), priorityWrite_1);
        }
        return node;
      }
    }
    function writeTreeChildWrites(writeTree, path) {
      return newWriteTreeRef(path, writeTree);
    }
    function writeTreeAddOverwrite(writeTree, path, snap, writeId, visible) {
      util.assert(writeId > writeTree.lastWriteId, "Stacking an older write on top of newer ones");
      if (visible === void 0) {
        visible = true;
      }
      writeTree.allWrites.push({
        path,
        snap,
        writeId,
        visible
      });
      if (visible) {
        writeTree.visibleWrites = compoundWriteAddWrite(writeTree.visibleWrites, path, snap);
      }
      writeTree.lastWriteId = writeId;
    }
    function writeTreeAddMerge(writeTree, path, changedChildren, writeId) {
      util.assert(writeId > writeTree.lastWriteId, "Stacking an older merge on top of newer ones");
      writeTree.allWrites.push({
        path,
        children: changedChildren,
        writeId,
        visible: true
      });
      writeTree.visibleWrites = compoundWriteAddWrites(writeTree.visibleWrites, path, changedChildren);
      writeTree.lastWriteId = writeId;
    }
    function writeTreeGetWrite(writeTree, writeId) {
      for (var i = 0; i < writeTree.allWrites.length; i++) {
        var record = writeTree.allWrites[i];
        if (record.writeId === writeId) {
          return record;
        }
      }
      return null;
    }
    function writeTreeRemoveWrite(writeTree, writeId) {
      var idx = writeTree.allWrites.findIndex(function(s2) {
        return s2.writeId === writeId;
      });
      util.assert(idx >= 0, "removeWrite called with nonexistent writeId.");
      var writeToRemove = writeTree.allWrites[idx];
      writeTree.allWrites.splice(idx, 1);
      var removedWriteWasVisible = writeToRemove.visible;
      var removedWriteOverlapsWithOtherWrites = false;
      var i = writeTree.allWrites.length - 1;
      while (removedWriteWasVisible && i >= 0) {
        var currentWrite = writeTree.allWrites[i];
        if (currentWrite.visible) {
          if (i >= idx && writeTreeRecordContainsPath_(currentWrite, writeToRemove.path)) {
            removedWriteWasVisible = false;
          } else if (pathContains(writeToRemove.path, currentWrite.path)) {
            removedWriteOverlapsWithOtherWrites = true;
          }
        }
        i--;
      }
      if (!removedWriteWasVisible) {
        return false;
      } else if (removedWriteOverlapsWithOtherWrites) {
        writeTreeResetTree_(writeTree);
        return true;
      } else {
        if (writeToRemove.snap) {
          writeTree.visibleWrites = compoundWriteRemoveWrite(writeTree.visibleWrites, writeToRemove.path);
        } else {
          var children = writeToRemove.children;
          each(children, function(childName) {
            writeTree.visibleWrites = compoundWriteRemoveWrite(writeTree.visibleWrites, pathChild(writeToRemove.path, childName));
          });
        }
        return true;
      }
    }
    function writeTreeRecordContainsPath_(writeRecord, path) {
      if (writeRecord.snap) {
        return pathContains(writeRecord.path, path);
      } else {
        for (var childName in writeRecord.children) {
          if (writeRecord.children.hasOwnProperty(childName) && pathContains(pathChild(writeRecord.path, childName), path)) {
            return true;
          }
        }
        return false;
      }
    }
    function writeTreeResetTree_(writeTree) {
      writeTree.visibleWrites = writeTreeLayerTree_(writeTree.allWrites, writeTreeDefaultFilter_, newEmptyPath());
      if (writeTree.allWrites.length > 0) {
        writeTree.lastWriteId = writeTree.allWrites[writeTree.allWrites.length - 1].writeId;
      } else {
        writeTree.lastWriteId = -1;
      }
    }
    function writeTreeDefaultFilter_(write) {
      return write.visible;
    }
    function writeTreeLayerTree_(writes, filter, treeRoot) {
      var compoundWrite = CompoundWrite.empty();
      for (var i = 0; i < writes.length; ++i) {
        var write = writes[i];
        if (filter(write)) {
          var writePath = write.path;
          var relativePath = void 0;
          if (write.snap) {
            if (pathContains(treeRoot, writePath)) {
              relativePath = newRelativePath(treeRoot, writePath);
              compoundWrite = compoundWriteAddWrite(compoundWrite, relativePath, write.snap);
            } else if (pathContains(writePath, treeRoot)) {
              relativePath = newRelativePath(writePath, treeRoot);
              compoundWrite = compoundWriteAddWrite(compoundWrite, newEmptyPath(), write.snap.getChild(relativePath));
            } else
              ;
          } else if (write.children) {
            if (pathContains(treeRoot, writePath)) {
              relativePath = newRelativePath(treeRoot, writePath);
              compoundWrite = compoundWriteAddWrites(compoundWrite, relativePath, write.children);
            } else if (pathContains(writePath, treeRoot)) {
              relativePath = newRelativePath(writePath, treeRoot);
              if (pathIsEmpty(relativePath)) {
                compoundWrite = compoundWriteAddWrites(compoundWrite, newEmptyPath(), write.children);
              } else {
                var child2 = util.safeGet(write.children, pathGetFront(relativePath));
                if (child2) {
                  var deepNode = child2.getChild(pathPopFront(relativePath));
                  compoundWrite = compoundWriteAddWrite(compoundWrite, newEmptyPath(), deepNode);
                }
              }
            } else
              ;
          } else {
            throw util.assertionError("WriteRecord should have .snap or .children");
          }
        }
      }
      return compoundWrite;
    }
    function writeTreeCalcCompleteEventCache(writeTree, treePath, completeServerCache, writeIdsToExclude, includeHiddenWrites) {
      if (!writeIdsToExclude && !includeHiddenWrites) {
        var shadowingNode = compoundWriteGetCompleteNode(writeTree.visibleWrites, treePath);
        if (shadowingNode != null) {
          return shadowingNode;
        } else {
          var subMerge = compoundWriteChildCompoundWrite(writeTree.visibleWrites, treePath);
          if (compoundWriteIsEmpty(subMerge)) {
            return completeServerCache;
          } else if (completeServerCache == null && !compoundWriteHasCompleteWrite(subMerge, newEmptyPath())) {
            return null;
          } else {
            var layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
            return compoundWriteApply(subMerge, layeredCache);
          }
        }
      } else {
        var merge = compoundWriteChildCompoundWrite(writeTree.visibleWrites, treePath);
        if (!includeHiddenWrites && compoundWriteIsEmpty(merge)) {
          return completeServerCache;
        } else {
          if (!includeHiddenWrites && completeServerCache == null && !compoundWriteHasCompleteWrite(merge, newEmptyPath())) {
            return null;
          } else {
            var filter = function(write) {
              return (write.visible || includeHiddenWrites) && (!writeIdsToExclude || !~writeIdsToExclude.indexOf(write.writeId)) && (pathContains(write.path, treePath) || pathContains(treePath, write.path));
            };
            var mergeAtPath = writeTreeLayerTree_(writeTree.allWrites, filter, treePath);
            var layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
            return compoundWriteApply(mergeAtPath, layeredCache);
          }
        }
      }
    }
    function writeTreeCalcCompleteEventChildren(writeTree, treePath, completeServerChildren) {
      var completeChildren = ChildrenNode.EMPTY_NODE;
      var topLevelSet = compoundWriteGetCompleteNode(writeTree.visibleWrites, treePath);
      if (topLevelSet) {
        if (!topLevelSet.isLeafNode()) {
          topLevelSet.forEachChild(PRIORITY_INDEX, function(childName, childSnap) {
            completeChildren = completeChildren.updateImmediateChild(childName, childSnap);
          });
        }
        return completeChildren;
      } else if (completeServerChildren) {
        var merge_1 = compoundWriteChildCompoundWrite(writeTree.visibleWrites, treePath);
        completeServerChildren.forEachChild(PRIORITY_INDEX, function(childName, childNode) {
          var node = compoundWriteApply(compoundWriteChildCompoundWrite(merge_1, new Path(childName)), childNode);
          completeChildren = completeChildren.updateImmediateChild(childName, node);
        });
        compoundWriteGetCompleteChildren(merge_1).forEach(function(namedNode) {
          completeChildren = completeChildren.updateImmediateChild(namedNode.name, namedNode.node);
        });
        return completeChildren;
      } else {
        var merge = compoundWriteChildCompoundWrite(writeTree.visibleWrites, treePath);
        compoundWriteGetCompleteChildren(merge).forEach(function(namedNode) {
          completeChildren = completeChildren.updateImmediateChild(namedNode.name, namedNode.node);
        });
        return completeChildren;
      }
    }
    function writeTreeCalcEventCacheAfterServerOverwrite(writeTree, treePath, childPath, existingEventSnap, existingServerSnap) {
      util.assert(existingEventSnap || existingServerSnap, "Either existingEventSnap or existingServerSnap must exist");
      var path = pathChild(treePath, childPath);
      if (compoundWriteHasCompleteWrite(writeTree.visibleWrites, path)) {
        return null;
      } else {
        var childMerge = compoundWriteChildCompoundWrite(writeTree.visibleWrites, path);
        if (compoundWriteIsEmpty(childMerge)) {
          return existingServerSnap.getChild(childPath);
        } else {
          return compoundWriteApply(childMerge, existingServerSnap.getChild(childPath));
        }
      }
    }
    function writeTreeCalcCompleteChild(writeTree, treePath, childKey, existingServerSnap) {
      var path = pathChild(treePath, childKey);
      var shadowingNode = compoundWriteGetCompleteNode(writeTree.visibleWrites, path);
      if (shadowingNode != null) {
        return shadowingNode;
      } else {
        if (existingServerSnap.isCompleteForChild(childKey)) {
          var childMerge = compoundWriteChildCompoundWrite(writeTree.visibleWrites, path);
          return compoundWriteApply(childMerge, existingServerSnap.getNode().getImmediateChild(childKey));
        } else {
          return null;
        }
      }
    }
    function writeTreeShadowingWrite(writeTree, path) {
      return compoundWriteGetCompleteNode(writeTree.visibleWrites, path);
    }
    function writeTreeCalcIndexedSlice(writeTree, treePath, completeServerData, startPost, count, reverse, index2) {
      var toIterate;
      var merge = compoundWriteChildCompoundWrite(writeTree.visibleWrites, treePath);
      var shadowingNode = compoundWriteGetCompleteNode(merge, newEmptyPath());
      if (shadowingNode != null) {
        toIterate = shadowingNode;
      } else if (completeServerData != null) {
        toIterate = compoundWriteApply(merge, completeServerData);
      } else {
        return [];
      }
      toIterate = toIterate.withIndex(index2);
      if (!toIterate.isEmpty() && !toIterate.isLeafNode()) {
        var nodes = [];
        var cmp = index2.getCompare();
        var iter = reverse ? toIterate.getReverseIteratorFrom(startPost, index2) : toIterate.getIteratorFrom(startPost, index2);
        var next = iter.getNext();
        while (next && nodes.length < count) {
          if (cmp(next, startPost) !== 0) {
            nodes.push(next);
          }
          next = iter.getNext();
        }
        return nodes;
      } else {
        return [];
      }
    }
    function newWriteTree() {
      return {
        visibleWrites: CompoundWrite.empty(),
        allWrites: [],
        lastWriteId: -1
      };
    }
    function writeTreeRefCalcCompleteEventCache(writeTreeRef, completeServerCache, writeIdsToExclude, includeHiddenWrites) {
      return writeTreeCalcCompleteEventCache(writeTreeRef.writeTree, writeTreeRef.treePath, completeServerCache, writeIdsToExclude, includeHiddenWrites);
    }
    function writeTreeRefCalcCompleteEventChildren(writeTreeRef, completeServerChildren) {
      return writeTreeCalcCompleteEventChildren(writeTreeRef.writeTree, writeTreeRef.treePath, completeServerChildren);
    }
    function writeTreeRefCalcEventCacheAfterServerOverwrite(writeTreeRef, path, existingEventSnap, existingServerSnap) {
      return writeTreeCalcEventCacheAfterServerOverwrite(writeTreeRef.writeTree, writeTreeRef.treePath, path, existingEventSnap, existingServerSnap);
    }
    function writeTreeRefShadowingWrite(writeTreeRef, path) {
      return writeTreeShadowingWrite(writeTreeRef.writeTree, pathChild(writeTreeRef.treePath, path));
    }
    function writeTreeRefCalcIndexedSlice(writeTreeRef, completeServerData, startPost, count, reverse, index2) {
      return writeTreeCalcIndexedSlice(writeTreeRef.writeTree, writeTreeRef.treePath, completeServerData, startPost, count, reverse, index2);
    }
    function writeTreeRefCalcCompleteChild(writeTreeRef, childKey, existingServerCache) {
      return writeTreeCalcCompleteChild(writeTreeRef.writeTree, writeTreeRef.treePath, childKey, existingServerCache);
    }
    function writeTreeRefChild(writeTreeRef, childName) {
      return newWriteTreeRef(pathChild(writeTreeRef.treePath, childName), writeTreeRef.writeTree);
    }
    function newWriteTreeRef(path, writeTree) {
      return {
        treePath: path,
        writeTree
      };
    }
    var ChildChangeAccumulator = function() {
      function ChildChangeAccumulator2() {
        this.changeMap = new Map();
      }
      ChildChangeAccumulator2.prototype.trackChildChange = function(change) {
        var type = change.type;
        var childKey = change.childName;
        util.assert(type === "child_added" || type === "child_changed" || type === "child_removed", "Only child changes supported for tracking");
        util.assert(childKey !== ".priority", "Only non-priority child changes can be tracked.");
        var oldChange = this.changeMap.get(childKey);
        if (oldChange) {
          var oldType = oldChange.type;
          if (type === "child_added" && oldType === "child_removed") {
            this.changeMap.set(childKey, changeChildChanged(childKey, change.snapshotNode, oldChange.snapshotNode));
          } else if (type === "child_removed" && oldType === "child_added") {
            this.changeMap.delete(childKey);
          } else if (type === "child_removed" && oldType === "child_changed") {
            this.changeMap.set(childKey, changeChildRemoved(childKey, oldChange.oldSnap));
          } else if (type === "child_changed" && oldType === "child_added") {
            this.changeMap.set(childKey, changeChildAdded(childKey, change.snapshotNode));
          } else if (type === "child_changed" && oldType === "child_changed") {
            this.changeMap.set(childKey, changeChildChanged(childKey, change.snapshotNode, oldChange.oldSnap));
          } else {
            throw util.assertionError("Illegal combination of changes: " + change + " occurred after " + oldChange);
          }
        } else {
          this.changeMap.set(childKey, change);
        }
      };
      ChildChangeAccumulator2.prototype.getChanges = function() {
        return Array.from(this.changeMap.values());
      };
      return ChildChangeAccumulator2;
    }();
    var NoCompleteChildSource_ = function() {
      function NoCompleteChildSource_2() {
      }
      NoCompleteChildSource_2.prototype.getCompleteChild = function(childKey) {
        return null;
      };
      NoCompleteChildSource_2.prototype.getChildAfterChild = function(index2, child2, reverse) {
        return null;
      };
      return NoCompleteChildSource_2;
    }();
    var NO_COMPLETE_CHILD_SOURCE = new NoCompleteChildSource_();
    var WriteTreeCompleteChildSource = function() {
      function WriteTreeCompleteChildSource2(writes_, viewCache_, optCompleteServerCache_) {
        if (optCompleteServerCache_ === void 0) {
          optCompleteServerCache_ = null;
        }
        this.writes_ = writes_;
        this.viewCache_ = viewCache_;
        this.optCompleteServerCache_ = optCompleteServerCache_;
      }
      WriteTreeCompleteChildSource2.prototype.getCompleteChild = function(childKey) {
        var node = this.viewCache_.eventCache;
        if (node.isCompleteForChild(childKey)) {
          return node.getNode().getImmediateChild(childKey);
        } else {
          var serverNode = this.optCompleteServerCache_ != null ? new CacheNode(this.optCompleteServerCache_, true, false) : this.viewCache_.serverCache;
          return writeTreeRefCalcCompleteChild(this.writes_, childKey, serverNode);
        }
      };
      WriteTreeCompleteChildSource2.prototype.getChildAfterChild = function(index2, child2, reverse) {
        var completeServerData = this.optCompleteServerCache_ != null ? this.optCompleteServerCache_ : viewCacheGetCompleteServerSnap(this.viewCache_);
        var nodes = writeTreeRefCalcIndexedSlice(this.writes_, completeServerData, child2, 1, reverse, index2);
        if (nodes.length === 0) {
          return null;
        } else {
          return nodes[0];
        }
      };
      return WriteTreeCompleteChildSource2;
    }();
    function newViewProcessor(filter) {
      return { filter };
    }
    function viewProcessorAssertIndexed(viewProcessor, viewCache) {
      util.assert(viewCache.eventCache.getNode().isIndexed(viewProcessor.filter.getIndex()), "Event snap not indexed");
      util.assert(viewCache.serverCache.getNode().isIndexed(viewProcessor.filter.getIndex()), "Server snap not indexed");
    }
    function viewProcessorApplyOperation(viewProcessor, oldViewCache, operation, writesCache, completeCache) {
      var accumulator = new ChildChangeAccumulator();
      var newViewCache2, filterServerNode;
      if (operation.type === OperationType.OVERWRITE) {
        var overwrite = operation;
        if (overwrite.source.fromUser) {
          newViewCache2 = viewProcessorApplyUserOverwrite(viewProcessor, oldViewCache, overwrite.path, overwrite.snap, writesCache, completeCache, accumulator);
        } else {
          util.assert(overwrite.source.fromServer, "Unknown source.");
          filterServerNode = overwrite.source.tagged || oldViewCache.serverCache.isFiltered() && !pathIsEmpty(overwrite.path);
          newViewCache2 = viewProcessorApplyServerOverwrite(viewProcessor, oldViewCache, overwrite.path, overwrite.snap, writesCache, completeCache, filterServerNode, accumulator);
        }
      } else if (operation.type === OperationType.MERGE) {
        var merge = operation;
        if (merge.source.fromUser) {
          newViewCache2 = viewProcessorApplyUserMerge(viewProcessor, oldViewCache, merge.path, merge.children, writesCache, completeCache, accumulator);
        } else {
          util.assert(merge.source.fromServer, "Unknown source.");
          filterServerNode = merge.source.tagged || oldViewCache.serverCache.isFiltered();
          newViewCache2 = viewProcessorApplyServerMerge(viewProcessor, oldViewCache, merge.path, merge.children, writesCache, completeCache, filterServerNode, accumulator);
        }
      } else if (operation.type === OperationType.ACK_USER_WRITE) {
        var ackUserWrite = operation;
        if (!ackUserWrite.revert) {
          newViewCache2 = viewProcessorAckUserWrite(viewProcessor, oldViewCache, ackUserWrite.path, ackUserWrite.affectedTree, writesCache, completeCache, accumulator);
        } else {
          newViewCache2 = viewProcessorRevertUserWrite(viewProcessor, oldViewCache, ackUserWrite.path, writesCache, completeCache, accumulator);
        }
      } else if (operation.type === OperationType.LISTEN_COMPLETE) {
        newViewCache2 = viewProcessorListenComplete(viewProcessor, oldViewCache, operation.path, writesCache, accumulator);
      } else {
        throw util.assertionError("Unknown operation type: " + operation.type);
      }
      var changes = accumulator.getChanges();
      viewProcessorMaybeAddValueEvent(oldViewCache, newViewCache2, changes);
      return { viewCache: newViewCache2, changes };
    }
    function viewProcessorMaybeAddValueEvent(oldViewCache, newViewCache2, accumulator) {
      var eventSnap = newViewCache2.eventCache;
      if (eventSnap.isFullyInitialized()) {
        var isLeafOrEmpty = eventSnap.getNode().isLeafNode() || eventSnap.getNode().isEmpty();
        var oldCompleteSnap = viewCacheGetCompleteEventSnap(oldViewCache);
        if (accumulator.length > 0 || !oldViewCache.eventCache.isFullyInitialized() || isLeafOrEmpty && !eventSnap.getNode().equals(oldCompleteSnap) || !eventSnap.getNode().getPriority().equals(oldCompleteSnap.getPriority())) {
          accumulator.push(changeValue(viewCacheGetCompleteEventSnap(newViewCache2)));
        }
      }
    }
    function viewProcessorGenerateEventCacheAfterServerEvent(viewProcessor, viewCache, changePath, writesCache, source, accumulator) {
      var oldEventSnap = viewCache.eventCache;
      if (writeTreeRefShadowingWrite(writesCache, changePath) != null) {
        return viewCache;
      } else {
        var newEventCache = void 0, serverNode = void 0;
        if (pathIsEmpty(changePath)) {
          util.assert(viewCache.serverCache.isFullyInitialized(), "If change path is empty, we must have complete server data");
          if (viewCache.serverCache.isFiltered()) {
            var serverCache = viewCacheGetCompleteServerSnap(viewCache);
            var completeChildren = serverCache instanceof ChildrenNode ? serverCache : ChildrenNode.EMPTY_NODE;
            var completeEventChildren = writeTreeRefCalcCompleteEventChildren(writesCache, completeChildren);
            newEventCache = viewProcessor.filter.updateFullNode(viewCache.eventCache.getNode(), completeEventChildren, accumulator);
          } else {
            var completeNode = writeTreeRefCalcCompleteEventCache(writesCache, viewCacheGetCompleteServerSnap(viewCache));
            newEventCache = viewProcessor.filter.updateFullNode(viewCache.eventCache.getNode(), completeNode, accumulator);
          }
        } else {
          var childKey = pathGetFront(changePath);
          if (childKey === ".priority") {
            util.assert(pathGetLength(changePath) === 1, "Can't have a priority with additional path components");
            var oldEventNode = oldEventSnap.getNode();
            serverNode = viewCache.serverCache.getNode();
            var updatedPriority = writeTreeRefCalcEventCacheAfterServerOverwrite(writesCache, changePath, oldEventNode, serverNode);
            if (updatedPriority != null) {
              newEventCache = viewProcessor.filter.updatePriority(oldEventNode, updatedPriority);
            } else {
              newEventCache = oldEventSnap.getNode();
            }
          } else {
            var childChangePath = pathPopFront(changePath);
            var newEventChild = void 0;
            if (oldEventSnap.isCompleteForChild(childKey)) {
              serverNode = viewCache.serverCache.getNode();
              var eventChildUpdate = writeTreeRefCalcEventCacheAfterServerOverwrite(writesCache, changePath, oldEventSnap.getNode(), serverNode);
              if (eventChildUpdate != null) {
                newEventChild = oldEventSnap.getNode().getImmediateChild(childKey).updateChild(childChangePath, eventChildUpdate);
              } else {
                newEventChild = oldEventSnap.getNode().getImmediateChild(childKey);
              }
            } else {
              newEventChild = writeTreeRefCalcCompleteChild(writesCache, childKey, viewCache.serverCache);
            }
            if (newEventChild != null) {
              newEventCache = viewProcessor.filter.updateChild(oldEventSnap.getNode(), childKey, newEventChild, childChangePath, source, accumulator);
            } else {
              newEventCache = oldEventSnap.getNode();
            }
          }
        }
        return viewCacheUpdateEventSnap(viewCache, newEventCache, oldEventSnap.isFullyInitialized() || pathIsEmpty(changePath), viewProcessor.filter.filtersNodes());
      }
    }
    function viewProcessorApplyServerOverwrite(viewProcessor, oldViewCache, changePath, changedSnap, writesCache, completeCache, filterServerNode, accumulator) {
      var oldServerSnap = oldViewCache.serverCache;
      var newServerCache;
      var serverFilter = filterServerNode ? viewProcessor.filter : viewProcessor.filter.getIndexedFilter();
      if (pathIsEmpty(changePath)) {
        newServerCache = serverFilter.updateFullNode(oldServerSnap.getNode(), changedSnap, null);
      } else if (serverFilter.filtersNodes() && !oldServerSnap.isFiltered()) {
        var newServerNode = oldServerSnap.getNode().updateChild(changePath, changedSnap);
        newServerCache = serverFilter.updateFullNode(oldServerSnap.getNode(), newServerNode, null);
      } else {
        var childKey = pathGetFront(changePath);
        if (!oldServerSnap.isCompleteForPath(changePath) && pathGetLength(changePath) > 1) {
          return oldViewCache;
        }
        var childChangePath = pathPopFront(changePath);
        var childNode = oldServerSnap.getNode().getImmediateChild(childKey);
        var newChildNode = childNode.updateChild(childChangePath, changedSnap);
        if (childKey === ".priority") {
          newServerCache = serverFilter.updatePriority(oldServerSnap.getNode(), newChildNode);
        } else {
          newServerCache = serverFilter.updateChild(oldServerSnap.getNode(), childKey, newChildNode, childChangePath, NO_COMPLETE_CHILD_SOURCE, null);
        }
      }
      var newViewCache2 = viewCacheUpdateServerSnap(oldViewCache, newServerCache, oldServerSnap.isFullyInitialized() || pathIsEmpty(changePath), serverFilter.filtersNodes());
      var source = new WriteTreeCompleteChildSource(writesCache, newViewCache2, completeCache);
      return viewProcessorGenerateEventCacheAfterServerEvent(viewProcessor, newViewCache2, changePath, writesCache, source, accumulator);
    }
    function viewProcessorApplyUserOverwrite(viewProcessor, oldViewCache, changePath, changedSnap, writesCache, completeCache, accumulator) {
      var oldEventSnap = oldViewCache.eventCache;
      var newViewCache2, newEventCache;
      var source = new WriteTreeCompleteChildSource(writesCache, oldViewCache, completeCache);
      if (pathIsEmpty(changePath)) {
        newEventCache = viewProcessor.filter.updateFullNode(oldViewCache.eventCache.getNode(), changedSnap, accumulator);
        newViewCache2 = viewCacheUpdateEventSnap(oldViewCache, newEventCache, true, viewProcessor.filter.filtersNodes());
      } else {
        var childKey = pathGetFront(changePath);
        if (childKey === ".priority") {
          newEventCache = viewProcessor.filter.updatePriority(oldViewCache.eventCache.getNode(), changedSnap);
          newViewCache2 = viewCacheUpdateEventSnap(oldViewCache, newEventCache, oldEventSnap.isFullyInitialized(), oldEventSnap.isFiltered());
        } else {
          var childChangePath = pathPopFront(changePath);
          var oldChild = oldEventSnap.getNode().getImmediateChild(childKey);
          var newChild = void 0;
          if (pathIsEmpty(childChangePath)) {
            newChild = changedSnap;
          } else {
            var childNode = source.getCompleteChild(childKey);
            if (childNode != null) {
              if (pathGetBack(childChangePath) === ".priority" && childNode.getChild(pathParent(childChangePath)).isEmpty()) {
                newChild = childNode;
              } else {
                newChild = childNode.updateChild(childChangePath, changedSnap);
              }
            } else {
              newChild = ChildrenNode.EMPTY_NODE;
            }
          }
          if (!oldChild.equals(newChild)) {
            var newEventSnap = viewProcessor.filter.updateChild(oldEventSnap.getNode(), childKey, newChild, childChangePath, source, accumulator);
            newViewCache2 = viewCacheUpdateEventSnap(oldViewCache, newEventSnap, oldEventSnap.isFullyInitialized(), viewProcessor.filter.filtersNodes());
          } else {
            newViewCache2 = oldViewCache;
          }
        }
      }
      return newViewCache2;
    }
    function viewProcessorCacheHasChild(viewCache, childKey) {
      return viewCache.eventCache.isCompleteForChild(childKey);
    }
    function viewProcessorApplyUserMerge(viewProcessor, viewCache, path, changedChildren, writesCache, serverCache, accumulator) {
      var curViewCache = viewCache;
      changedChildren.foreach(function(relativePath, childNode) {
        var writePath = pathChild(path, relativePath);
        if (viewProcessorCacheHasChild(viewCache, pathGetFront(writePath))) {
          curViewCache = viewProcessorApplyUserOverwrite(viewProcessor, curViewCache, writePath, childNode, writesCache, serverCache, accumulator);
        }
      });
      changedChildren.foreach(function(relativePath, childNode) {
        var writePath = pathChild(path, relativePath);
        if (!viewProcessorCacheHasChild(viewCache, pathGetFront(writePath))) {
          curViewCache = viewProcessorApplyUserOverwrite(viewProcessor, curViewCache, writePath, childNode, writesCache, serverCache, accumulator);
        }
      });
      return curViewCache;
    }
    function viewProcessorApplyMerge(viewProcessor, node, merge) {
      merge.foreach(function(relativePath, childNode) {
        node = node.updateChild(relativePath, childNode);
      });
      return node;
    }
    function viewProcessorApplyServerMerge(viewProcessor, viewCache, path, changedChildren, writesCache, serverCache, filterServerNode, accumulator) {
      if (viewCache.serverCache.getNode().isEmpty() && !viewCache.serverCache.isFullyInitialized()) {
        return viewCache;
      }
      var curViewCache = viewCache;
      var viewMergeTree;
      if (pathIsEmpty(path)) {
        viewMergeTree = changedChildren;
      } else {
        viewMergeTree = new ImmutableTree(null).setTree(path, changedChildren);
      }
      var serverNode = viewCache.serverCache.getNode();
      viewMergeTree.children.inorderTraversal(function(childKey, childTree) {
        if (serverNode.hasChild(childKey)) {
          var serverChild = viewCache.serverCache.getNode().getImmediateChild(childKey);
          var newChild = viewProcessorApplyMerge(viewProcessor, serverChild, childTree);
          curViewCache = viewProcessorApplyServerOverwrite(viewProcessor, curViewCache, new Path(childKey), newChild, writesCache, serverCache, filterServerNode, accumulator);
        }
      });
      viewMergeTree.children.inorderTraversal(function(childKey, childMergeTree) {
        var isUnknownDeepMerge = !viewCache.serverCache.isCompleteForChild(childKey) && childMergeTree.value === void 0;
        if (!serverNode.hasChild(childKey) && !isUnknownDeepMerge) {
          var serverChild = viewCache.serverCache.getNode().getImmediateChild(childKey);
          var newChild = viewProcessorApplyMerge(viewProcessor, serverChild, childMergeTree);
          curViewCache = viewProcessorApplyServerOverwrite(viewProcessor, curViewCache, new Path(childKey), newChild, writesCache, serverCache, filterServerNode, accumulator);
        }
      });
      return curViewCache;
    }
    function viewProcessorAckUserWrite(viewProcessor, viewCache, ackPath, affectedTree, writesCache, completeCache, accumulator) {
      if (writeTreeRefShadowingWrite(writesCache, ackPath) != null) {
        return viewCache;
      }
      var filterServerNode = viewCache.serverCache.isFiltered();
      var serverCache = viewCache.serverCache;
      if (affectedTree.value != null) {
        if (pathIsEmpty(ackPath) && serverCache.isFullyInitialized() || serverCache.isCompleteForPath(ackPath)) {
          return viewProcessorApplyServerOverwrite(viewProcessor, viewCache, ackPath, serverCache.getNode().getChild(ackPath), writesCache, completeCache, filterServerNode, accumulator);
        } else if (pathIsEmpty(ackPath)) {
          var changedChildren_1 = new ImmutableTree(null);
          serverCache.getNode().forEachChild(KEY_INDEX, function(name2, node) {
            changedChildren_1 = changedChildren_1.set(new Path(name2), node);
          });
          return viewProcessorApplyServerMerge(viewProcessor, viewCache, ackPath, changedChildren_1, writesCache, completeCache, filterServerNode, accumulator);
        } else {
          return viewCache;
        }
      } else {
        var changedChildren_2 = new ImmutableTree(null);
        affectedTree.foreach(function(mergePath, value) {
          var serverCachePath = pathChild(ackPath, mergePath);
          if (serverCache.isCompleteForPath(serverCachePath)) {
            changedChildren_2 = changedChildren_2.set(mergePath, serverCache.getNode().getChild(serverCachePath));
          }
        });
        return viewProcessorApplyServerMerge(viewProcessor, viewCache, ackPath, changedChildren_2, writesCache, completeCache, filterServerNode, accumulator);
      }
    }
    function viewProcessorListenComplete(viewProcessor, viewCache, path, writesCache, accumulator) {
      var oldServerNode = viewCache.serverCache;
      var newViewCache2 = viewCacheUpdateServerSnap(viewCache, oldServerNode.getNode(), oldServerNode.isFullyInitialized() || pathIsEmpty(path), oldServerNode.isFiltered());
      return viewProcessorGenerateEventCacheAfterServerEvent(viewProcessor, newViewCache2, path, writesCache, NO_COMPLETE_CHILD_SOURCE, accumulator);
    }
    function viewProcessorRevertUserWrite(viewProcessor, viewCache, path, writesCache, completeServerCache, accumulator) {
      var complete;
      if (writeTreeRefShadowingWrite(writesCache, path) != null) {
        return viewCache;
      } else {
        var source = new WriteTreeCompleteChildSource(writesCache, viewCache, completeServerCache);
        var oldEventCache = viewCache.eventCache.getNode();
        var newEventCache = void 0;
        if (pathIsEmpty(path) || pathGetFront(path) === ".priority") {
          var newNode = void 0;
          if (viewCache.serverCache.isFullyInitialized()) {
            newNode = writeTreeRefCalcCompleteEventCache(writesCache, viewCacheGetCompleteServerSnap(viewCache));
          } else {
            var serverChildren = viewCache.serverCache.getNode();
            util.assert(serverChildren instanceof ChildrenNode, "serverChildren would be complete if leaf node");
            newNode = writeTreeRefCalcCompleteEventChildren(writesCache, serverChildren);
          }
          newNode = newNode;
          newEventCache = viewProcessor.filter.updateFullNode(oldEventCache, newNode, accumulator);
        } else {
          var childKey = pathGetFront(path);
          var newChild = writeTreeRefCalcCompleteChild(writesCache, childKey, viewCache.serverCache);
          if (newChild == null && viewCache.serverCache.isCompleteForChild(childKey)) {
            newChild = oldEventCache.getImmediateChild(childKey);
          }
          if (newChild != null) {
            newEventCache = viewProcessor.filter.updateChild(oldEventCache, childKey, newChild, pathPopFront(path), source, accumulator);
          } else if (viewCache.eventCache.getNode().hasChild(childKey)) {
            newEventCache = viewProcessor.filter.updateChild(oldEventCache, childKey, ChildrenNode.EMPTY_NODE, pathPopFront(path), source, accumulator);
          } else {
            newEventCache = oldEventCache;
          }
          if (newEventCache.isEmpty() && viewCache.serverCache.isFullyInitialized()) {
            complete = writeTreeRefCalcCompleteEventCache(writesCache, viewCacheGetCompleteServerSnap(viewCache));
            if (complete.isLeafNode()) {
              newEventCache = viewProcessor.filter.updateFullNode(newEventCache, complete, accumulator);
            }
          }
        }
        complete = viewCache.serverCache.isFullyInitialized() || writeTreeRefShadowingWrite(writesCache, newEmptyPath()) != null;
        return viewCacheUpdateEventSnap(viewCache, newEventCache, complete, viewProcessor.filter.filtersNodes());
      }
    }
    var View = function() {
      function View2(query_, initialViewCache) {
        this.query_ = query_;
        this.eventRegistrations_ = [];
        var params = this.query_._queryParams;
        var indexFilter = new IndexedFilter(params.getIndex());
        var filter = queryParamsGetNodeFilter(params);
        this.processor_ = newViewProcessor(filter);
        var initialServerCache = initialViewCache.serverCache;
        var initialEventCache = initialViewCache.eventCache;
        var serverSnap = indexFilter.updateFullNode(ChildrenNode.EMPTY_NODE, initialServerCache.getNode(), null);
        var eventSnap = filter.updateFullNode(ChildrenNode.EMPTY_NODE, initialEventCache.getNode(), null);
        var newServerCache = new CacheNode(serverSnap, initialServerCache.isFullyInitialized(), indexFilter.filtersNodes());
        var newEventCache = new CacheNode(eventSnap, initialEventCache.isFullyInitialized(), filter.filtersNodes());
        this.viewCache_ = newViewCache(newEventCache, newServerCache);
        this.eventGenerator_ = new EventGenerator(this.query_);
      }
      Object.defineProperty(View2.prototype, "query", {
        get: function() {
          return this.query_;
        },
        enumerable: false,
        configurable: true
      });
      return View2;
    }();
    function viewGetServerCache(view) {
      return view.viewCache_.serverCache.getNode();
    }
    function viewGetCompleteNode(view) {
      return viewCacheGetCompleteEventSnap(view.viewCache_);
    }
    function viewGetCompleteServerCache(view, path) {
      var cache = viewCacheGetCompleteServerSnap(view.viewCache_);
      if (cache) {
        if (view.query._queryParams.loadsAllData() || !pathIsEmpty(path) && !cache.getImmediateChild(pathGetFront(path)).isEmpty()) {
          return cache.getChild(path);
        }
      }
      return null;
    }
    function viewIsEmpty(view) {
      return view.eventRegistrations_.length === 0;
    }
    function viewAddEventRegistration(view, eventRegistration) {
      view.eventRegistrations_.push(eventRegistration);
    }
    function viewRemoveEventRegistration(view, eventRegistration, cancelError) {
      var cancelEvents = [];
      if (cancelError) {
        util.assert(eventRegistration == null, "A cancel should cancel all event registrations.");
        var path_1 = view.query._path;
        view.eventRegistrations_.forEach(function(registration) {
          var maybeEvent = registration.createCancelEvent(cancelError, path_1);
          if (maybeEvent) {
            cancelEvents.push(maybeEvent);
          }
        });
      }
      if (eventRegistration) {
        var remaining = [];
        for (var i = 0; i < view.eventRegistrations_.length; ++i) {
          var existing = view.eventRegistrations_[i];
          if (!existing.matches(eventRegistration)) {
            remaining.push(existing);
          } else if (eventRegistration.hasAnyCallback()) {
            remaining = remaining.concat(view.eventRegistrations_.slice(i + 1));
            break;
          }
        }
        view.eventRegistrations_ = remaining;
      } else {
        view.eventRegistrations_ = [];
      }
      return cancelEvents;
    }
    function viewApplyOperation(view, operation, writesCache, completeServerCache) {
      if (operation.type === OperationType.MERGE && operation.source.queryId !== null) {
        util.assert(viewCacheGetCompleteServerSnap(view.viewCache_), "We should always have a full cache before handling merges");
        util.assert(viewCacheGetCompleteEventSnap(view.viewCache_), "Missing event cache, even though we have a server cache");
      }
      var oldViewCache = view.viewCache_;
      var result = viewProcessorApplyOperation(view.processor_, oldViewCache, operation, writesCache, completeServerCache);
      viewProcessorAssertIndexed(view.processor_, result.viewCache);
      util.assert(result.viewCache.serverCache.isFullyInitialized() || !oldViewCache.serverCache.isFullyInitialized(), "Once a server snap is complete, it should never go back");
      view.viewCache_ = result.viewCache;
      return viewGenerateEventsForChanges_(view, result.changes, result.viewCache.eventCache.getNode(), null);
    }
    function viewGetInitialEvents(view, registration) {
      var eventSnap = view.viewCache_.eventCache;
      var initialChanges = [];
      if (!eventSnap.getNode().isLeafNode()) {
        var eventNode = eventSnap.getNode();
        eventNode.forEachChild(PRIORITY_INDEX, function(key, childNode) {
          initialChanges.push(changeChildAdded(key, childNode));
        });
      }
      if (eventSnap.isFullyInitialized()) {
        initialChanges.push(changeValue(eventSnap.getNode()));
      }
      return viewGenerateEventsForChanges_(view, initialChanges, eventSnap.getNode(), registration);
    }
    function viewGenerateEventsForChanges_(view, changes, eventCache, eventRegistration) {
      var registrations = eventRegistration ? [eventRegistration] : view.eventRegistrations_;
      return eventGeneratorGenerateEventsForChanges(view.eventGenerator_, changes, eventCache, registrations);
    }
    var referenceConstructor$1;
    var SyncPoint = function() {
      function SyncPoint2() {
        this.views = new Map();
      }
      return SyncPoint2;
    }();
    function syncPointSetReferenceConstructor(val) {
      util.assert(!referenceConstructor$1, "__referenceConstructor has already been defined");
      referenceConstructor$1 = val;
    }
    function syncPointGetReferenceConstructor() {
      util.assert(referenceConstructor$1, "Reference.ts has not been loaded");
      return referenceConstructor$1;
    }
    function syncPointIsEmpty(syncPoint) {
      return syncPoint.views.size === 0;
    }
    function syncPointApplyOperation(syncPoint, operation, writesCache, optCompleteServerCache) {
      var e_1, _a;
      var queryId = operation.source.queryId;
      if (queryId !== null) {
        var view = syncPoint.views.get(queryId);
        util.assert(view != null, "SyncTree gave us an op for an invalid query.");
        return viewApplyOperation(view, operation, writesCache, optCompleteServerCache);
      } else {
        var events = [];
        try {
          for (var _b = tslib.__values(syncPoint.views.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var view = _c.value;
            events = events.concat(viewApplyOperation(view, operation, writesCache, optCompleteServerCache));
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return))
              _a.call(_b);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
        return events;
      }
    }
    function syncPointGetView(syncPoint, query2, writesCache, serverCache, serverCacheComplete) {
      var queryId = query2._queryIdentifier;
      var view = syncPoint.views.get(queryId);
      if (!view) {
        var eventCache = writeTreeRefCalcCompleteEventCache(writesCache, serverCacheComplete ? serverCache : null);
        var eventCacheComplete = false;
        if (eventCache) {
          eventCacheComplete = true;
        } else if (serverCache instanceof ChildrenNode) {
          eventCache = writeTreeRefCalcCompleteEventChildren(writesCache, serverCache);
          eventCacheComplete = false;
        } else {
          eventCache = ChildrenNode.EMPTY_NODE;
          eventCacheComplete = false;
        }
        var viewCache = newViewCache(new CacheNode(eventCache, eventCacheComplete, false), new CacheNode(serverCache, serverCacheComplete, false));
        return new View(query2, viewCache);
      }
      return view;
    }
    function syncPointAddEventRegistration(syncPoint, query2, eventRegistration, writesCache, serverCache, serverCacheComplete) {
      var view = syncPointGetView(syncPoint, query2, writesCache, serverCache, serverCacheComplete);
      if (!syncPoint.views.has(query2._queryIdentifier)) {
        syncPoint.views.set(query2._queryIdentifier, view);
      }
      viewAddEventRegistration(view, eventRegistration);
      return viewGetInitialEvents(view, eventRegistration);
    }
    function syncPointRemoveEventRegistration(syncPoint, query2, eventRegistration, cancelError) {
      var e_2, _a;
      var queryId = query2._queryIdentifier;
      var removed = [];
      var cancelEvents = [];
      var hadCompleteView = syncPointHasCompleteView(syncPoint);
      if (queryId === "default") {
        try {
          for (var _b = tslib.__values(syncPoint.views.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = tslib.__read(_c.value, 2), viewQueryId = _d[0], view = _d[1];
            cancelEvents = cancelEvents.concat(viewRemoveEventRegistration(view, eventRegistration, cancelError));
            if (viewIsEmpty(view)) {
              syncPoint.views.delete(viewQueryId);
              if (!view.query._queryParams.loadsAllData()) {
                removed.push(view.query);
              }
            }
          }
        } catch (e_2_1) {
          e_2 = { error: e_2_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return))
              _a.call(_b);
          } finally {
            if (e_2)
              throw e_2.error;
          }
        }
      } else {
        var view = syncPoint.views.get(queryId);
        if (view) {
          cancelEvents = cancelEvents.concat(viewRemoveEventRegistration(view, eventRegistration, cancelError));
          if (viewIsEmpty(view)) {
            syncPoint.views.delete(queryId);
            if (!view.query._queryParams.loadsAllData()) {
              removed.push(view.query);
            }
          }
        }
      }
      if (hadCompleteView && !syncPointHasCompleteView(syncPoint)) {
        removed.push(new (syncPointGetReferenceConstructor())(query2._repo, query2._path));
      }
      return { removed, events: cancelEvents };
    }
    function syncPointGetQueryViews(syncPoint) {
      var e_3, _a;
      var result = [];
      try {
        for (var _b = tslib.__values(syncPoint.views.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
          var view = _c.value;
          if (!view.query._queryParams.loadsAllData()) {
            result.push(view);
          }
        }
      } catch (e_3_1) {
        e_3 = { error: e_3_1 };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return))
            _a.call(_b);
        } finally {
          if (e_3)
            throw e_3.error;
        }
      }
      return result;
    }
    function syncPointGetCompleteServerCache(syncPoint, path) {
      var e_4, _a;
      var serverCache = null;
      try {
        for (var _b = tslib.__values(syncPoint.views.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
          var view = _c.value;
          serverCache = serverCache || viewGetCompleteServerCache(view, path);
        }
      } catch (e_4_1) {
        e_4 = { error: e_4_1 };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return))
            _a.call(_b);
        } finally {
          if (e_4)
            throw e_4.error;
        }
      }
      return serverCache;
    }
    function syncPointViewForQuery(syncPoint, query2) {
      var params = query2._queryParams;
      if (params.loadsAllData()) {
        return syncPointGetCompleteView(syncPoint);
      } else {
        var queryId = query2._queryIdentifier;
        return syncPoint.views.get(queryId);
      }
    }
    function syncPointViewExistsForQuery(syncPoint, query2) {
      return syncPointViewForQuery(syncPoint, query2) != null;
    }
    function syncPointHasCompleteView(syncPoint) {
      return syncPointGetCompleteView(syncPoint) != null;
    }
    function syncPointGetCompleteView(syncPoint) {
      var e_5, _a;
      try {
        for (var _b = tslib.__values(syncPoint.views.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
          var view = _c.value;
          if (view.query._queryParams.loadsAllData()) {
            return view;
          }
        }
      } catch (e_5_1) {
        e_5 = { error: e_5_1 };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return))
            _a.call(_b);
        } finally {
          if (e_5)
            throw e_5.error;
        }
      }
      return null;
    }
    var referenceConstructor;
    function syncTreeSetReferenceConstructor(val) {
      util.assert(!referenceConstructor, "__referenceConstructor has already been defined");
      referenceConstructor = val;
    }
    function syncTreeGetReferenceConstructor() {
      util.assert(referenceConstructor, "Reference.ts has not been loaded");
      return referenceConstructor;
    }
    var syncTreeNextQueryTag_ = 1;
    var SyncTree = function() {
      function SyncTree2(listenProvider_) {
        this.listenProvider_ = listenProvider_;
        this.syncPointTree_ = new ImmutableTree(null);
        this.pendingWriteTree_ = newWriteTree();
        this.tagToQueryMap = new Map();
        this.queryToTagMap = new Map();
      }
      return SyncTree2;
    }();
    function syncTreeApplyUserOverwrite(syncTree, path, newData, writeId, visible) {
      writeTreeAddOverwrite(syncTree.pendingWriteTree_, path, newData, writeId, visible);
      if (!visible) {
        return [];
      } else {
        return syncTreeApplyOperationToSyncPoints_(syncTree, new Overwrite(newOperationSourceUser(), path, newData));
      }
    }
    function syncTreeApplyUserMerge(syncTree, path, changedChildren, writeId) {
      writeTreeAddMerge(syncTree.pendingWriteTree_, path, changedChildren, writeId);
      var changeTree = ImmutableTree.fromObject(changedChildren);
      return syncTreeApplyOperationToSyncPoints_(syncTree, new Merge(newOperationSourceUser(), path, changeTree));
    }
    function syncTreeAckUserWrite(syncTree, writeId, revert) {
      if (revert === void 0) {
        revert = false;
      }
      var write = writeTreeGetWrite(syncTree.pendingWriteTree_, writeId);
      var needToReevaluate = writeTreeRemoveWrite(syncTree.pendingWriteTree_, writeId);
      if (!needToReevaluate) {
        return [];
      } else {
        var affectedTree_1 = new ImmutableTree(null);
        if (write.snap != null) {
          affectedTree_1 = affectedTree_1.set(newEmptyPath(), true);
        } else {
          each(write.children, function(pathString) {
            affectedTree_1 = affectedTree_1.set(new Path(pathString), true);
          });
        }
        return syncTreeApplyOperationToSyncPoints_(syncTree, new AckUserWrite(write.path, affectedTree_1, revert));
      }
    }
    function syncTreeApplyServerOverwrite(syncTree, path, newData) {
      return syncTreeApplyOperationToSyncPoints_(syncTree, new Overwrite(newOperationSourceServer(), path, newData));
    }
    function syncTreeApplyServerMerge(syncTree, path, changedChildren) {
      var changeTree = ImmutableTree.fromObject(changedChildren);
      return syncTreeApplyOperationToSyncPoints_(syncTree, new Merge(newOperationSourceServer(), path, changeTree));
    }
    function syncTreeApplyListenComplete(syncTree, path) {
      return syncTreeApplyOperationToSyncPoints_(syncTree, new ListenComplete(newOperationSourceServer(), path));
    }
    function syncTreeApplyTaggedListenComplete(syncTree, path, tag) {
      var queryKey = syncTreeQueryKeyForTag_(syncTree, tag);
      if (queryKey) {
        var r = syncTreeParseQueryKey_(queryKey);
        var queryPath = r.path, queryId = r.queryId;
        var relativePath = newRelativePath(queryPath, path);
        var op = new ListenComplete(newOperationSourceServerTaggedQuery(queryId), relativePath);
        return syncTreeApplyTaggedOperation_(syncTree, queryPath, op);
      } else {
        return [];
      }
    }
    function syncTreeRemoveEventRegistration(syncTree, query2, eventRegistration, cancelError) {
      var path = query2._path;
      var maybeSyncPoint = syncTree.syncPointTree_.get(path);
      var cancelEvents = [];
      if (maybeSyncPoint && (query2._queryIdentifier === "default" || syncPointViewExistsForQuery(maybeSyncPoint, query2))) {
        var removedAndEvents = syncPointRemoveEventRegistration(maybeSyncPoint, query2, eventRegistration, cancelError);
        if (syncPointIsEmpty(maybeSyncPoint)) {
          syncTree.syncPointTree_ = syncTree.syncPointTree_.remove(path);
        }
        var removed = removedAndEvents.removed;
        cancelEvents = removedAndEvents.events;
        var removingDefault = removed.findIndex(function(query3) {
          return query3._queryParams.loadsAllData();
        }) !== -1;
        var covered = syncTree.syncPointTree_.findOnPath(path, function(relativePath, parentSyncPoint) {
          return syncPointHasCompleteView(parentSyncPoint);
        });
        if (removingDefault && !covered) {
          var subtree = syncTree.syncPointTree_.subtree(path);
          if (!subtree.isEmpty()) {
            var newViews = syncTreeCollectDistinctViewsForSubTree_(subtree);
            for (var i = 0; i < newViews.length; ++i) {
              var view = newViews[i], newQuery = view.query;
              var listener = syncTreeCreateListenerForView_(syncTree, view);
              syncTree.listenProvider_.startListening(syncTreeQueryForListening_(newQuery), syncTreeTagForQuery_(syncTree, newQuery), listener.hashFn, listener.onComplete);
            }
          }
        }
        if (!covered && removed.length > 0 && !cancelError) {
          if (removingDefault) {
            var defaultTag = null;
            syncTree.listenProvider_.stopListening(syncTreeQueryForListening_(query2), defaultTag);
          } else {
            removed.forEach(function(queryToRemove) {
              var tagToRemove = syncTree.queryToTagMap.get(syncTreeMakeQueryKey_(queryToRemove));
              syncTree.listenProvider_.stopListening(syncTreeQueryForListening_(queryToRemove), tagToRemove);
            });
          }
        }
        syncTreeRemoveTags_(syncTree, removed);
      }
      return cancelEvents;
    }
    function syncTreeApplyTaggedQueryOverwrite(syncTree, path, snap, tag) {
      var queryKey = syncTreeQueryKeyForTag_(syncTree, tag);
      if (queryKey != null) {
        var r = syncTreeParseQueryKey_(queryKey);
        var queryPath = r.path, queryId = r.queryId;
        var relativePath = newRelativePath(queryPath, path);
        var op = new Overwrite(newOperationSourceServerTaggedQuery(queryId), relativePath, snap);
        return syncTreeApplyTaggedOperation_(syncTree, queryPath, op);
      } else {
        return [];
      }
    }
    function syncTreeApplyTaggedQueryMerge(syncTree, path, changedChildren, tag) {
      var queryKey = syncTreeQueryKeyForTag_(syncTree, tag);
      if (queryKey) {
        var r = syncTreeParseQueryKey_(queryKey);
        var queryPath = r.path, queryId = r.queryId;
        var relativePath = newRelativePath(queryPath, path);
        var changeTree = ImmutableTree.fromObject(changedChildren);
        var op = new Merge(newOperationSourceServerTaggedQuery(queryId), relativePath, changeTree);
        return syncTreeApplyTaggedOperation_(syncTree, queryPath, op);
      } else {
        return [];
      }
    }
    function syncTreeAddEventRegistration(syncTree, query2, eventRegistration) {
      var path = query2._path;
      var serverCache = null;
      var foundAncestorDefaultView = false;
      syncTree.syncPointTree_.foreachOnPath(path, function(pathToSyncPoint, sp) {
        var relativePath = newRelativePath(pathToSyncPoint, path);
        serverCache = serverCache || syncPointGetCompleteServerCache(sp, relativePath);
        foundAncestorDefaultView = foundAncestorDefaultView || syncPointHasCompleteView(sp);
      });
      var syncPoint = syncTree.syncPointTree_.get(path);
      if (!syncPoint) {
        syncPoint = new SyncPoint();
        syncTree.syncPointTree_ = syncTree.syncPointTree_.set(path, syncPoint);
      } else {
        foundAncestorDefaultView = foundAncestorDefaultView || syncPointHasCompleteView(syncPoint);
        serverCache = serverCache || syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
      }
      var serverCacheComplete;
      if (serverCache != null) {
        serverCacheComplete = true;
      } else {
        serverCacheComplete = false;
        serverCache = ChildrenNode.EMPTY_NODE;
        var subtree = syncTree.syncPointTree_.subtree(path);
        subtree.foreachChild(function(childName, childSyncPoint) {
          var completeCache = syncPointGetCompleteServerCache(childSyncPoint, newEmptyPath());
          if (completeCache) {
            serverCache = serverCache.updateImmediateChild(childName, completeCache);
          }
        });
      }
      var viewAlreadyExists = syncPointViewExistsForQuery(syncPoint, query2);
      if (!viewAlreadyExists && !query2._queryParams.loadsAllData()) {
        var queryKey = syncTreeMakeQueryKey_(query2);
        util.assert(!syncTree.queryToTagMap.has(queryKey), "View does not exist, but we have a tag");
        var tag = syncTreeGetNextQueryTag_();
        syncTree.queryToTagMap.set(queryKey, tag);
        syncTree.tagToQueryMap.set(tag, queryKey);
      }
      var writesCache = writeTreeChildWrites(syncTree.pendingWriteTree_, path);
      var events = syncPointAddEventRegistration(syncPoint, query2, eventRegistration, writesCache, serverCache, serverCacheComplete);
      if (!viewAlreadyExists && !foundAncestorDefaultView) {
        var view = syncPointViewForQuery(syncPoint, query2);
        events = events.concat(syncTreeSetupListener_(syncTree, query2, view));
      }
      return events;
    }
    function syncTreeCalcCompleteEventCache(syncTree, path, writeIdsToExclude) {
      var includeHiddenSets = true;
      var writeTree = syncTree.pendingWriteTree_;
      var serverCache = syncTree.syncPointTree_.findOnPath(path, function(pathSoFar, syncPoint) {
        var relativePath = newRelativePath(pathSoFar, path);
        var serverCache2 = syncPointGetCompleteServerCache(syncPoint, relativePath);
        if (serverCache2) {
          return serverCache2;
        }
      });
      return writeTreeCalcCompleteEventCache(writeTree, path, serverCache, writeIdsToExclude, includeHiddenSets);
    }
    function syncTreeGetServerValue(syncTree, query2) {
      var path = query2._path;
      var serverCache = null;
      syncTree.syncPointTree_.foreachOnPath(path, function(pathToSyncPoint, sp) {
        var relativePath = newRelativePath(pathToSyncPoint, path);
        serverCache = serverCache || syncPointGetCompleteServerCache(sp, relativePath);
      });
      var syncPoint = syncTree.syncPointTree_.get(path);
      if (!syncPoint) {
        syncPoint = new SyncPoint();
        syncTree.syncPointTree_ = syncTree.syncPointTree_.set(path, syncPoint);
      } else {
        serverCache = serverCache || syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
      }
      var serverCacheComplete = serverCache != null;
      var serverCacheNode = serverCacheComplete ? new CacheNode(serverCache, true, false) : null;
      var writesCache = writeTreeChildWrites(syncTree.pendingWriteTree_, query2._path);
      var view = syncPointGetView(syncPoint, query2, writesCache, serverCacheComplete ? serverCacheNode.getNode() : ChildrenNode.EMPTY_NODE, serverCacheComplete);
      return viewGetCompleteNode(view);
    }
    function syncTreeApplyOperationToSyncPoints_(syncTree, operation) {
      return syncTreeApplyOperationHelper_(operation, syncTree.syncPointTree_, null, writeTreeChildWrites(syncTree.pendingWriteTree_, newEmptyPath()));
    }
    function syncTreeApplyOperationHelper_(operation, syncPointTree, serverCache, writesCache) {
      if (pathIsEmpty(operation.path)) {
        return syncTreeApplyOperationDescendantsHelper_(operation, syncPointTree, serverCache, writesCache);
      } else {
        var syncPoint = syncPointTree.get(newEmptyPath());
        if (serverCache == null && syncPoint != null) {
          serverCache = syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
        }
        var events = [];
        var childName = pathGetFront(operation.path);
        var childOperation = operation.operationForChild(childName);
        var childTree = syncPointTree.children.get(childName);
        if (childTree && childOperation) {
          var childServerCache = serverCache ? serverCache.getImmediateChild(childName) : null;
          var childWritesCache = writeTreeRefChild(writesCache, childName);
          events = events.concat(syncTreeApplyOperationHelper_(childOperation, childTree, childServerCache, childWritesCache));
        }
        if (syncPoint) {
          events = events.concat(syncPointApplyOperation(syncPoint, operation, writesCache, serverCache));
        }
        return events;
      }
    }
    function syncTreeApplyOperationDescendantsHelper_(operation, syncPointTree, serverCache, writesCache) {
      var syncPoint = syncPointTree.get(newEmptyPath());
      if (serverCache == null && syncPoint != null) {
        serverCache = syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
      }
      var events = [];
      syncPointTree.children.inorderTraversal(function(childName, childTree) {
        var childServerCache = serverCache ? serverCache.getImmediateChild(childName) : null;
        var childWritesCache = writeTreeRefChild(writesCache, childName);
        var childOperation = operation.operationForChild(childName);
        if (childOperation) {
          events = events.concat(syncTreeApplyOperationDescendantsHelper_(childOperation, childTree, childServerCache, childWritesCache));
        }
      });
      if (syncPoint) {
        events = events.concat(syncPointApplyOperation(syncPoint, operation, writesCache, serverCache));
      }
      return events;
    }
    function syncTreeCreateListenerForView_(syncTree, view) {
      var query2 = view.query;
      var tag = syncTreeTagForQuery_(syncTree, query2);
      return {
        hashFn: function() {
          var cache = viewGetServerCache(view) || ChildrenNode.EMPTY_NODE;
          return cache.hash();
        },
        onComplete: function(status) {
          if (status === "ok") {
            if (tag) {
              return syncTreeApplyTaggedListenComplete(syncTree, query2._path, tag);
            } else {
              return syncTreeApplyListenComplete(syncTree, query2._path);
            }
          } else {
            var error4 = errorForServerCode(status, query2);
            return syncTreeRemoveEventRegistration(syncTree, query2, null, error4);
          }
        }
      };
    }
    function syncTreeTagForQuery_(syncTree, query2) {
      var queryKey = syncTreeMakeQueryKey_(query2);
      return syncTree.queryToTagMap.get(queryKey);
    }
    function syncTreeMakeQueryKey_(query2) {
      return query2._path.toString() + "$" + query2._queryIdentifier;
    }
    function syncTreeQueryKeyForTag_(syncTree, tag) {
      return syncTree.tagToQueryMap.get(tag);
    }
    function syncTreeParseQueryKey_(queryKey) {
      var splitIndex = queryKey.indexOf("$");
      util.assert(splitIndex !== -1 && splitIndex < queryKey.length - 1, "Bad queryKey.");
      return {
        queryId: queryKey.substr(splitIndex + 1),
        path: new Path(queryKey.substr(0, splitIndex))
      };
    }
    function syncTreeApplyTaggedOperation_(syncTree, queryPath, operation) {
      var syncPoint = syncTree.syncPointTree_.get(queryPath);
      util.assert(syncPoint, "Missing sync point for query tag that we're tracking");
      var writesCache = writeTreeChildWrites(syncTree.pendingWriteTree_, queryPath);
      return syncPointApplyOperation(syncPoint, operation, writesCache, null);
    }
    function syncTreeCollectDistinctViewsForSubTree_(subtree) {
      return subtree.fold(function(relativePath, maybeChildSyncPoint, childMap) {
        if (maybeChildSyncPoint && syncPointHasCompleteView(maybeChildSyncPoint)) {
          var completeView = syncPointGetCompleteView(maybeChildSyncPoint);
          return [completeView];
        } else {
          var views_1 = [];
          if (maybeChildSyncPoint) {
            views_1 = syncPointGetQueryViews(maybeChildSyncPoint);
          }
          each(childMap, function(_key, childViews) {
            views_1 = views_1.concat(childViews);
          });
          return views_1;
        }
      });
    }
    function syncTreeQueryForListening_(query2) {
      if (query2._queryParams.loadsAllData() && !query2._queryParams.isDefault()) {
        return new (syncTreeGetReferenceConstructor())(query2._repo, query2._path);
      } else {
        return query2;
      }
    }
    function syncTreeRemoveTags_(syncTree, queries) {
      for (var j = 0; j < queries.length; ++j) {
        var removedQuery = queries[j];
        if (!removedQuery._queryParams.loadsAllData()) {
          var removedQueryKey = syncTreeMakeQueryKey_(removedQuery);
          var removedQueryTag = syncTree.queryToTagMap.get(removedQueryKey);
          syncTree.queryToTagMap.delete(removedQueryKey);
          syncTree.tagToQueryMap.delete(removedQueryTag);
        }
      }
    }
    function syncTreeGetNextQueryTag_() {
      return syncTreeNextQueryTag_++;
    }
    function syncTreeSetupListener_(syncTree, query2, view) {
      var path = query2._path;
      var tag = syncTreeTagForQuery_(syncTree, query2);
      var listener = syncTreeCreateListenerForView_(syncTree, view);
      var events = syncTree.listenProvider_.startListening(syncTreeQueryForListening_(query2), tag, listener.hashFn, listener.onComplete);
      var subtree = syncTree.syncPointTree_.subtree(path);
      if (tag) {
        util.assert(!syncPointHasCompleteView(subtree.value), "If we're adding a query, it shouldn't be shadowed");
      } else {
        var queriesToStop = subtree.fold(function(relativePath, maybeChildSyncPoint, childMap) {
          if (!pathIsEmpty(relativePath) && maybeChildSyncPoint && syncPointHasCompleteView(maybeChildSyncPoint)) {
            return [syncPointGetCompleteView(maybeChildSyncPoint).query];
          } else {
            var queries_1 = [];
            if (maybeChildSyncPoint) {
              queries_1 = queries_1.concat(syncPointGetQueryViews(maybeChildSyncPoint).map(function(view2) {
                return view2.query;
              }));
            }
            each(childMap, function(_key, childQueries) {
              queries_1 = queries_1.concat(childQueries);
            });
            return queries_1;
          }
        });
        for (var i = 0; i < queriesToStop.length; ++i) {
          var queryToStop = queriesToStop[i];
          syncTree.listenProvider_.stopListening(syncTreeQueryForListening_(queryToStop), syncTreeTagForQuery_(syncTree, queryToStop));
        }
      }
      return events;
    }
    var ExistingValueProvider = function() {
      function ExistingValueProvider2(node_) {
        this.node_ = node_;
      }
      ExistingValueProvider2.prototype.getImmediateChild = function(childName) {
        var child2 = this.node_.getImmediateChild(childName);
        return new ExistingValueProvider2(child2);
      };
      ExistingValueProvider2.prototype.node = function() {
        return this.node_;
      };
      return ExistingValueProvider2;
    }();
    var DeferredValueProvider = function() {
      function DeferredValueProvider2(syncTree, path) {
        this.syncTree_ = syncTree;
        this.path_ = path;
      }
      DeferredValueProvider2.prototype.getImmediateChild = function(childName) {
        var childPath = pathChild(this.path_, childName);
        return new DeferredValueProvider2(this.syncTree_, childPath);
      };
      DeferredValueProvider2.prototype.node = function() {
        return syncTreeCalcCompleteEventCache(this.syncTree_, this.path_);
      };
      return DeferredValueProvider2;
    }();
    var generateWithValues = function(values) {
      values = values || {};
      values["timestamp"] = values["timestamp"] || new Date().getTime();
      return values;
    };
    var resolveDeferredLeafValue = function(value, existingVal, serverValues) {
      if (!value || typeof value !== "object") {
        return value;
      }
      util.assert(".sv" in value, "Unexpected leaf node or priority contents");
      if (typeof value[".sv"] === "string") {
        return resolveScalarDeferredValue(value[".sv"], existingVal, serverValues);
      } else if (typeof value[".sv"] === "object") {
        return resolveComplexDeferredValue(value[".sv"], existingVal);
      } else {
        util.assert(false, "Unexpected server value: " + JSON.stringify(value, null, 2));
      }
    };
    var resolveScalarDeferredValue = function(op, existing, serverValues) {
      switch (op) {
        case "timestamp":
          return serverValues["timestamp"];
        default:
          util.assert(false, "Unexpected server value: " + op);
      }
    };
    var resolveComplexDeferredValue = function(op, existing, unused) {
      if (!op.hasOwnProperty("increment")) {
        util.assert(false, "Unexpected server value: " + JSON.stringify(op, null, 2));
      }
      var delta = op["increment"];
      if (typeof delta !== "number") {
        util.assert(false, "Unexpected increment value: " + delta);
      }
      var existingNode = existing.node();
      util.assert(existingNode !== null && typeof existingNode !== "undefined", "Expected ChildrenNode.EMPTY_NODE for nulls");
      if (!existingNode.isLeafNode()) {
        return delta;
      }
      var leaf = existingNode;
      var existingVal = leaf.getValue();
      if (typeof existingVal !== "number") {
        return delta;
      }
      return existingVal + delta;
    };
    var resolveDeferredValueTree = function(path, node, syncTree, serverValues) {
      return resolveDeferredValue(node, new DeferredValueProvider(syncTree, path), serverValues);
    };
    var resolveDeferredValueSnapshot = function(node, existing, serverValues) {
      return resolveDeferredValue(node, new ExistingValueProvider(existing), serverValues);
    };
    function resolveDeferredValue(node, existingVal, serverValues) {
      var rawPri = node.getPriority().val();
      var priority = resolveDeferredLeafValue(rawPri, existingVal.getImmediateChild(".priority"), serverValues);
      var newNode;
      if (node.isLeafNode()) {
        var leafNode = node;
        var value = resolveDeferredLeafValue(leafNode.getValue(), existingVal, serverValues);
        if (value !== leafNode.getValue() || priority !== leafNode.getPriority().val()) {
          return new LeafNode(value, nodeFromJSON(priority));
        } else {
          return node;
        }
      } else {
        var childrenNode = node;
        newNode = childrenNode;
        if (priority !== childrenNode.getPriority().val()) {
          newNode = newNode.updatePriority(new LeafNode(priority));
        }
        childrenNode.forEachChild(PRIORITY_INDEX, function(childName, childNode) {
          var newChildNode = resolveDeferredValue(childNode, existingVal.getImmediateChild(childName), serverValues);
          if (newChildNode !== childNode) {
            newNode = newNode.updateImmediateChild(childName, newChildNode);
          }
        });
        return newNode;
      }
    }
    var Tree = function() {
      function Tree2(name2, parent, node) {
        if (name2 === void 0) {
          name2 = "";
        }
        if (parent === void 0) {
          parent = null;
        }
        if (node === void 0) {
          node = { children: {}, childCount: 0 };
        }
        this.name = name2;
        this.parent = parent;
        this.node = node;
      }
      return Tree2;
    }();
    function treeSubTree(tree, pathObj) {
      var path = pathObj instanceof Path ? pathObj : new Path(pathObj);
      var child2 = tree, next = pathGetFront(path);
      while (next !== null) {
        var childNode = util.safeGet(child2.node.children, next) || {
          children: {},
          childCount: 0
        };
        child2 = new Tree(next, child2, childNode);
        path = pathPopFront(path);
        next = pathGetFront(path);
      }
      return child2;
    }
    function treeGetValue(tree) {
      return tree.node.value;
    }
    function treeSetValue(tree, value) {
      tree.node.value = value;
      treeUpdateParents(tree);
    }
    function treeHasChildren(tree) {
      return tree.node.childCount > 0;
    }
    function treeIsEmpty(tree) {
      return treeGetValue(tree) === void 0 && !treeHasChildren(tree);
    }
    function treeForEachChild(tree, action) {
      each(tree.node.children, function(child2, childTree) {
        action(new Tree(child2, tree, childTree));
      });
    }
    function treeForEachDescendant(tree, action, includeSelf, childrenFirst) {
      if (includeSelf && !childrenFirst) {
        action(tree);
      }
      treeForEachChild(tree, function(child2) {
        treeForEachDescendant(child2, action, true, childrenFirst);
      });
      if (includeSelf && childrenFirst) {
        action(tree);
      }
    }
    function treeForEachAncestor(tree, action, includeSelf) {
      var node = includeSelf ? tree : tree.parent;
      while (node !== null) {
        if (action(node)) {
          return true;
        }
        node = node.parent;
      }
      return false;
    }
    function treeGetPath(tree) {
      return new Path(tree.parent === null ? tree.name : treeGetPath(tree.parent) + "/" + tree.name);
    }
    function treeUpdateParents(tree) {
      if (tree.parent !== null) {
        treeUpdateChild(tree.parent, tree.name, tree);
      }
    }
    function treeUpdateChild(tree, childName, child2) {
      var childEmpty = treeIsEmpty(child2);
      var childExists = util.contains(tree.node.children, childName);
      if (childEmpty && childExists) {
        delete tree.node.children[childName];
        tree.node.childCount--;
        treeUpdateParents(tree);
      } else if (!childEmpty && !childExists) {
        tree.node.children[childName] = child2.node;
        tree.node.childCount++;
        treeUpdateParents(tree);
      }
    }
    var INVALID_KEY_REGEX_ = /[\[\].#$\/\u0000-\u001F\u007F]/;
    var INVALID_PATH_REGEX_ = /[\[\].#$\u0000-\u001F\u007F]/;
    var MAX_LEAF_SIZE_ = 10 * 1024 * 1024;
    var isValidKey = function(key) {
      return typeof key === "string" && key.length !== 0 && !INVALID_KEY_REGEX_.test(key);
    };
    var isValidPathString = function(pathString) {
      return typeof pathString === "string" && pathString.length !== 0 && !INVALID_PATH_REGEX_.test(pathString);
    };
    var isValidRootPathString = function(pathString) {
      if (pathString) {
        pathString = pathString.replace(/^\/*\.info(\/|$)/, "/");
      }
      return isValidPathString(pathString);
    };
    var isValidPriority = function(priority) {
      return priority === null || typeof priority === "string" || typeof priority === "number" && !isInvalidJSONNumber(priority) || priority && typeof priority === "object" && util.contains(priority, ".sv");
    };
    var validateFirebaseDataArg = function(fnName, value, path, optional) {
      if (optional && value === void 0) {
        return;
      }
      validateFirebaseData(util.errorPrefix(fnName, "value"), value, path);
    };
    var validateFirebaseData = function(errorPrefix, data, path_) {
      var path = path_ instanceof Path ? new ValidationPath(path_, errorPrefix) : path_;
      if (data === void 0) {
        throw new Error(errorPrefix + "contains undefined " + validationPathToErrorString(path));
      }
      if (typeof data === "function") {
        throw new Error(errorPrefix + "contains a function " + validationPathToErrorString(path) + " with contents = " + data.toString());
      }
      if (isInvalidJSONNumber(data)) {
        throw new Error(errorPrefix + "contains " + data.toString() + " " + validationPathToErrorString(path));
      }
      if (typeof data === "string" && data.length > MAX_LEAF_SIZE_ / 3 && util.stringLength(data) > MAX_LEAF_SIZE_) {
        throw new Error(errorPrefix + "contains a string greater than " + MAX_LEAF_SIZE_ + " utf8 bytes " + validationPathToErrorString(path) + " ('" + data.substring(0, 50) + "...')");
      }
      if (data && typeof data === "object") {
        var hasDotValue_1 = false;
        var hasActualChild_1 = false;
        each(data, function(key, value) {
          if (key === ".value") {
            hasDotValue_1 = true;
          } else if (key !== ".priority" && key !== ".sv") {
            hasActualChild_1 = true;
            if (!isValidKey(key)) {
              throw new Error(errorPrefix + " contains an invalid key (" + key + ") " + validationPathToErrorString(path) + `.  Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`);
            }
          }
          validationPathPush(path, key);
          validateFirebaseData(errorPrefix, value, path);
          validationPathPop(path);
        });
        if (hasDotValue_1 && hasActualChild_1) {
          throw new Error(errorPrefix + ' contains ".value" child ' + validationPathToErrorString(path) + " in addition to actual children.");
        }
      }
    };
    var validateFirebaseMergePaths = function(errorPrefix, mergePaths) {
      var i, curPath;
      for (i = 0; i < mergePaths.length; i++) {
        curPath = mergePaths[i];
        var keys = pathSlice(curPath);
        for (var j = 0; j < keys.length; j++) {
          if (keys[j] === ".priority" && j === keys.length - 1)
            ;
          else if (!isValidKey(keys[j])) {
            throw new Error(errorPrefix + "contains an invalid key (" + keys[j] + ") in path " + curPath.toString() + `. Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`);
          }
        }
      }
      mergePaths.sort(pathCompare);
      var prevPath = null;
      for (i = 0; i < mergePaths.length; i++) {
        curPath = mergePaths[i];
        if (prevPath !== null && pathContains(prevPath, curPath)) {
          throw new Error(errorPrefix + "contains a path " + prevPath.toString() + " that is ancestor of another path " + curPath.toString());
        }
        prevPath = curPath;
      }
    };
    var validateFirebaseMergeDataArg = function(fnName, data, path, optional) {
      if (optional && data === void 0) {
        return;
      }
      var errorPrefix = util.errorPrefix(fnName, "values");
      if (!(data && typeof data === "object") || Array.isArray(data)) {
        throw new Error(errorPrefix + " must be an object containing the children to replace.");
      }
      var mergePaths = [];
      each(data, function(key, value) {
        var curPath = new Path(key);
        validateFirebaseData(errorPrefix, value, pathChild(path, curPath));
        if (pathGetBack(curPath) === ".priority") {
          if (!isValidPriority(value)) {
            throw new Error(errorPrefix + "contains an invalid value for '" + curPath.toString() + "', which must be a valid Firebase priority (a string, finite number, server value, or null).");
          }
        }
        mergePaths.push(curPath);
      });
      validateFirebaseMergePaths(errorPrefix, mergePaths);
    };
    var validatePriority = function(fnName, priority, optional) {
      if (optional && priority === void 0) {
        return;
      }
      if (isInvalidJSONNumber(priority)) {
        throw new Error(util.errorPrefix(fnName, "priority") + "is " + priority.toString() + ", but must be a valid Firebase priority (a string, finite number, server value, or null).");
      }
      if (!isValidPriority(priority)) {
        throw new Error(util.errorPrefix(fnName, "priority") + "must be a valid Firebase priority (a string, finite number, server value, or null).");
      }
    };
    var validateEventType = function(fnName, eventType, optional) {
      if (optional && eventType === void 0) {
        return;
      }
      switch (eventType) {
        case "value":
        case "child_added":
        case "child_removed":
        case "child_changed":
        case "child_moved":
          break;
        default:
          throw new Error(util.errorPrefix(fnName, "eventType") + 'must be a valid event type = "value", "child_added", "child_removed", "child_changed", or "child_moved".');
      }
    };
    var validateKey = function(fnName, argumentName, key, optional) {
      if (optional && key === void 0) {
        return;
      }
      if (!isValidKey(key)) {
        throw new Error(util.errorPrefix(fnName, argumentName) + 'was an invalid key = "' + key + `".  Firebase keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]").`);
      }
    };
    var validatePathString = function(fnName, argumentName, pathString, optional) {
      if (optional && pathString === void 0) {
        return;
      }
      if (!isValidPathString(pathString)) {
        throw new Error(util.errorPrefix(fnName, argumentName) + 'was an invalid path = "' + pathString + `". Paths must be non-empty strings and can't contain ".", "#", "$", "[", or "]"`);
      }
    };
    var validateRootPathString = function(fnName, argumentName, pathString, optional) {
      if (pathString) {
        pathString = pathString.replace(/^\/*\.info(\/|$)/, "/");
      }
      validatePathString(fnName, argumentName, pathString, optional);
    };
    var validateWritablePath = function(fnName, path) {
      if (pathGetFront(path) === ".info") {
        throw new Error(fnName + " failed = Can't modify data under /.info/");
      }
    };
    var validateUrl = function(fnName, parsedUrl) {
      var pathString = parsedUrl.path.toString();
      if (!(typeof parsedUrl.repoInfo.host === "string") || parsedUrl.repoInfo.host.length === 0 || !isValidKey(parsedUrl.repoInfo.namespace) && parsedUrl.repoInfo.host.split(":")[0] !== "localhost" || pathString.length !== 0 && !isValidRootPathString(pathString)) {
        throw new Error(util.errorPrefix(fnName, "url") + `must be a valid firebase URL and the path can't contain ".", "#", "$", "[", or "]".`);
      }
    };
    var validateBoolean = function(fnName, argumentName, bool, optional) {
      if (optional && bool === void 0) {
        return;
      }
      if (typeof bool !== "boolean") {
        throw new Error(util.errorPrefix(fnName, argumentName) + "must be a boolean.");
      }
    };
    var EventQueue = function() {
      function EventQueue2() {
        this.eventLists_ = [];
        this.recursionDepth_ = 0;
      }
      return EventQueue2;
    }();
    function eventQueueQueueEvents(eventQueue, eventDataList) {
      var currList = null;
      for (var i = 0; i < eventDataList.length; i++) {
        var data = eventDataList[i];
        var path = data.getPath();
        if (currList !== null && !pathEquals(path, currList.path)) {
          eventQueue.eventLists_.push(currList);
          currList = null;
        }
        if (currList === null) {
          currList = { events: [], path };
        }
        currList.events.push(data);
      }
      if (currList) {
        eventQueue.eventLists_.push(currList);
      }
    }
    function eventQueueRaiseEventsAtPath(eventQueue, path, eventDataList) {
      eventQueueQueueEvents(eventQueue, eventDataList);
      eventQueueRaiseQueuedEventsMatchingPredicate(eventQueue, function(eventPath) {
        return pathEquals(eventPath, path);
      });
    }
    function eventQueueRaiseEventsForChangedPath(eventQueue, changedPath, eventDataList) {
      eventQueueQueueEvents(eventQueue, eventDataList);
      eventQueueRaiseQueuedEventsMatchingPredicate(eventQueue, function(eventPath) {
        return pathContains(eventPath, changedPath) || pathContains(changedPath, eventPath);
      });
    }
    function eventQueueRaiseQueuedEventsMatchingPredicate(eventQueue, predicate) {
      eventQueue.recursionDepth_++;
      var sentAll = true;
      for (var i = 0; i < eventQueue.eventLists_.length; i++) {
        var eventList = eventQueue.eventLists_[i];
        if (eventList) {
          var eventPath = eventList.path;
          if (predicate(eventPath)) {
            eventListRaise(eventQueue.eventLists_[i]);
            eventQueue.eventLists_[i] = null;
          } else {
            sentAll = false;
          }
        }
      }
      if (sentAll) {
        eventQueue.eventLists_ = [];
      }
      eventQueue.recursionDepth_--;
    }
    function eventListRaise(eventList) {
      for (var i = 0; i < eventList.events.length; i++) {
        var eventData = eventList.events[i];
        if (eventData !== null) {
          eventList.events[i] = null;
          var eventFn = eventData.getEventRunner();
          if (logger) {
            log("event: " + eventData.toString());
          }
          exceptionGuard(eventFn);
        }
      }
    }
    var INTERRUPT_REASON = "repo_interrupt";
    var MAX_TRANSACTION_RETRIES = 25;
    var Repo = function() {
      function Repo2(repoInfo_, forceRestClient_, authTokenProvider_, appCheckProvider_) {
        this.repoInfo_ = repoInfo_;
        this.forceRestClient_ = forceRestClient_;
        this.authTokenProvider_ = authTokenProvider_;
        this.appCheckProvider_ = appCheckProvider_;
        this.dataUpdateCount = 0;
        this.statsListener_ = null;
        this.eventQueue_ = new EventQueue();
        this.nextWriteId_ = 1;
        this.interceptServerDataCallback_ = null;
        this.onDisconnect_ = newSparseSnapshotTree();
        this.transactionQueueTree_ = new Tree();
        this.persistentConnection_ = null;
        this.key = this.repoInfo_.toURLString();
      }
      Repo2.prototype.toString = function() {
        return (this.repoInfo_.secure ? "https://" : "http://") + this.repoInfo_.host;
      };
      return Repo2;
    }();
    function repoStart(repo, appId, authOverride) {
      repo.stats_ = statsManagerGetCollection(repo.repoInfo_);
      if (repo.forceRestClient_ || beingCrawled()) {
        repo.server_ = new ReadonlyRestClient(repo.repoInfo_, function(pathString, data, isMerge, tag) {
          repoOnDataUpdate(repo, pathString, data, isMerge, tag);
        }, repo.authTokenProvider_, repo.appCheckProvider_);
        setTimeout(function() {
          return repoOnConnectStatus(repo, true);
        }, 0);
      } else {
        if (typeof authOverride !== "undefined" && authOverride !== null) {
          if (typeof authOverride !== "object") {
            throw new Error("Only objects are supported for option databaseAuthVariableOverride");
          }
          try {
            util.stringify(authOverride);
          } catch (e) {
            throw new Error("Invalid authOverride provided: " + e);
          }
        }
        repo.persistentConnection_ = new PersistentConnection(repo.repoInfo_, appId, function(pathString, data, isMerge, tag) {
          repoOnDataUpdate(repo, pathString, data, isMerge, tag);
        }, function(connectStatus) {
          repoOnConnectStatus(repo, connectStatus);
        }, function(updates) {
          repoOnServerInfoUpdate(repo, updates);
        }, repo.authTokenProvider_, repo.appCheckProvider_, authOverride);
        repo.server_ = repo.persistentConnection_;
      }
      repo.authTokenProvider_.addTokenChangeListener(function(token) {
        repo.server_.refreshAuthToken(token);
      });
      repo.appCheckProvider_.addTokenChangeListener(function(result) {
        repo.server_.refreshAppCheckToken(result.token);
      });
      repo.statsReporter_ = statsManagerGetOrCreateReporter(repo.repoInfo_, function() {
        return new StatsReporter(repo.stats_, repo.server_);
      });
      repo.infoData_ = new SnapshotHolder();
      repo.infoSyncTree_ = new SyncTree({
        startListening: function(query2, tag, currentHashFn, onComplete) {
          var infoEvents = [];
          var node = repo.infoData_.getNode(query2._path);
          if (!node.isEmpty()) {
            infoEvents = syncTreeApplyServerOverwrite(repo.infoSyncTree_, query2._path, node);
            setTimeout(function() {
              onComplete("ok");
            }, 0);
          }
          return infoEvents;
        },
        stopListening: function() {
        }
      });
      repoUpdateInfo(repo, "connected", false);
      repo.serverSyncTree_ = new SyncTree({
        startListening: function(query2, tag, currentHashFn, onComplete) {
          repo.server_.listen(query2, currentHashFn, tag, function(status, data) {
            var events = onComplete(status, data);
            eventQueueRaiseEventsForChangedPath(repo.eventQueue_, query2._path, events);
          });
          return [];
        },
        stopListening: function(query2, tag) {
          repo.server_.unlisten(query2, tag);
        }
      });
    }
    function repoServerTime(repo) {
      var offsetNode = repo.infoData_.getNode(new Path(".info/serverTimeOffset"));
      var offset = offsetNode.val() || 0;
      return new Date().getTime() + offset;
    }
    function repoGenerateServerValues(repo) {
      return generateWithValues({
        timestamp: repoServerTime(repo)
      });
    }
    function repoOnDataUpdate(repo, pathString, data, isMerge, tag) {
      repo.dataUpdateCount++;
      var path = new Path(pathString);
      data = repo.interceptServerDataCallback_ ? repo.interceptServerDataCallback_(pathString, data) : data;
      var events = [];
      if (tag) {
        if (isMerge) {
          var taggedChildren = util.map(data, function(raw) {
            return nodeFromJSON(raw);
          });
          events = syncTreeApplyTaggedQueryMerge(repo.serverSyncTree_, path, taggedChildren, tag);
        } else {
          var taggedSnap = nodeFromJSON(data);
          events = syncTreeApplyTaggedQueryOverwrite(repo.serverSyncTree_, path, taggedSnap, tag);
        }
      } else if (isMerge) {
        var changedChildren = util.map(data, function(raw) {
          return nodeFromJSON(raw);
        });
        events = syncTreeApplyServerMerge(repo.serverSyncTree_, path, changedChildren);
      } else {
        var snap = nodeFromJSON(data);
        events = syncTreeApplyServerOverwrite(repo.serverSyncTree_, path, snap);
      }
      var affectedPath = path;
      if (events.length > 0) {
        affectedPath = repoRerunTransactions(repo, path);
      }
      eventQueueRaiseEventsForChangedPath(repo.eventQueue_, affectedPath, events);
    }
    function repoInterceptServerData(repo, callback) {
      repo.interceptServerDataCallback_ = callback;
    }
    function repoOnConnectStatus(repo, connectStatus) {
      repoUpdateInfo(repo, "connected", connectStatus);
      if (connectStatus === false) {
        repoRunOnDisconnectEvents(repo);
      }
    }
    function repoOnServerInfoUpdate(repo, updates) {
      each(updates, function(key, value) {
        repoUpdateInfo(repo, key, value);
      });
    }
    function repoUpdateInfo(repo, pathString, value) {
      var path = new Path("/.info/" + pathString);
      var newNode = nodeFromJSON(value);
      repo.infoData_.updateSnapshot(path, newNode);
      var events = syncTreeApplyServerOverwrite(repo.infoSyncTree_, path, newNode);
      eventQueueRaiseEventsForChangedPath(repo.eventQueue_, path, events);
    }
    function repoGetNextWriteId(repo) {
      return repo.nextWriteId_++;
    }
    function repoGetValue(repo, query2) {
      var cached = syncTreeGetServerValue(repo.serverSyncTree_, query2);
      if (cached != null) {
        return Promise.resolve(cached);
      }
      return repo.server_.get(query2).then(function(payload) {
        var node = nodeFromJSON(payload).withIndex(query2._queryParams.getIndex());
        var events = syncTreeApplyServerOverwrite(repo.serverSyncTree_, query2._path, node);
        eventQueueRaiseEventsAtPath(repo.eventQueue_, query2._path, events);
        return Promise.resolve(node);
      }, function(err) {
        repoLog(repo, "get for query " + util.stringify(query2) + " failed: " + err);
        return Promise.reject(new Error(err));
      });
    }
    function repoSetWithPriority(repo, path, newVal, newPriority, onComplete) {
      repoLog(repo, "set", {
        path: path.toString(),
        value: newVal,
        priority: newPriority
      });
      var serverValues = repoGenerateServerValues(repo);
      var newNodeUnresolved = nodeFromJSON(newVal, newPriority);
      var existing = syncTreeCalcCompleteEventCache(repo.serverSyncTree_, path);
      var newNode = resolveDeferredValueSnapshot(newNodeUnresolved, existing, serverValues);
      var writeId = repoGetNextWriteId(repo);
      var events = syncTreeApplyUserOverwrite(repo.serverSyncTree_, path, newNode, writeId, true);
      eventQueueQueueEvents(repo.eventQueue_, events);
      repo.server_.put(path.toString(), newNodeUnresolved.val(true), function(status, errorReason) {
        var success = status === "ok";
        if (!success) {
          warn("set at " + path + " failed: " + status);
        }
        var clearEvents = syncTreeAckUserWrite(repo.serverSyncTree_, writeId, !success);
        eventQueueRaiseEventsForChangedPath(repo.eventQueue_, path, clearEvents);
        repoCallOnCompleteCallback(repo, onComplete, status, errorReason);
      });
      var affectedPath = repoAbortTransactions(repo, path);
      repoRerunTransactions(repo, affectedPath);
      eventQueueRaiseEventsForChangedPath(repo.eventQueue_, affectedPath, []);
    }
    function repoUpdate(repo, path, childrenToMerge, onComplete) {
      repoLog(repo, "update", { path: path.toString(), value: childrenToMerge });
      var empty2 = true;
      var serverValues = repoGenerateServerValues(repo);
      var changedChildren = {};
      each(childrenToMerge, function(changedKey, changedValue) {
        empty2 = false;
        changedChildren[changedKey] = resolveDeferredValueTree(pathChild(path, changedKey), nodeFromJSON(changedValue), repo.serverSyncTree_, serverValues);
      });
      if (!empty2) {
        var writeId_1 = repoGetNextWriteId(repo);
        var events = syncTreeApplyUserMerge(repo.serverSyncTree_, path, changedChildren, writeId_1);
        eventQueueQueueEvents(repo.eventQueue_, events);
        repo.server_.merge(path.toString(), childrenToMerge, function(status, errorReason) {
          var success = status === "ok";
          if (!success) {
            warn("update at " + path + " failed: " + status);
          }
          var clearEvents = syncTreeAckUserWrite(repo.serverSyncTree_, writeId_1, !success);
          var affectedPath = clearEvents.length > 0 ? repoRerunTransactions(repo, path) : path;
          eventQueueRaiseEventsForChangedPath(repo.eventQueue_, affectedPath, clearEvents);
          repoCallOnCompleteCallback(repo, onComplete, status, errorReason);
        });
        each(childrenToMerge, function(changedPath) {
          var affectedPath = repoAbortTransactions(repo, pathChild(path, changedPath));
          repoRerunTransactions(repo, affectedPath);
        });
        eventQueueRaiseEventsForChangedPath(repo.eventQueue_, path, []);
      } else {
        log("update() called with empty data.  Don't do anything.");
        repoCallOnCompleteCallback(repo, onComplete, "ok", void 0);
      }
    }
    function repoRunOnDisconnectEvents(repo) {
      repoLog(repo, "onDisconnectEvents");
      var serverValues = repoGenerateServerValues(repo);
      var resolvedOnDisconnectTree = newSparseSnapshotTree();
      sparseSnapshotTreeForEachTree(repo.onDisconnect_, newEmptyPath(), function(path, node) {
        var resolved = resolveDeferredValueTree(path, node, repo.serverSyncTree_, serverValues);
        sparseSnapshotTreeRemember(resolvedOnDisconnectTree, path, resolved);
      });
      var events = [];
      sparseSnapshotTreeForEachTree(resolvedOnDisconnectTree, newEmptyPath(), function(path, snap) {
        events = events.concat(syncTreeApplyServerOverwrite(repo.serverSyncTree_, path, snap));
        var affectedPath = repoAbortTransactions(repo, path);
        repoRerunTransactions(repo, affectedPath);
      });
      repo.onDisconnect_ = newSparseSnapshotTree();
      eventQueueRaiseEventsForChangedPath(repo.eventQueue_, newEmptyPath(), events);
    }
    function repoOnDisconnectCancel(repo, path, onComplete) {
      repo.server_.onDisconnectCancel(path.toString(), function(status, errorReason) {
        if (status === "ok") {
          sparseSnapshotTreeForget(repo.onDisconnect_, path);
        }
        repoCallOnCompleteCallback(repo, onComplete, status, errorReason);
      });
    }
    function repoOnDisconnectSet(repo, path, value, onComplete) {
      var newNode = nodeFromJSON(value);
      repo.server_.onDisconnectPut(path.toString(), newNode.val(true), function(status, errorReason) {
        if (status === "ok") {
          sparseSnapshotTreeRemember(repo.onDisconnect_, path, newNode);
        }
        repoCallOnCompleteCallback(repo, onComplete, status, errorReason);
      });
    }
    function repoOnDisconnectSetWithPriority(repo, path, value, priority, onComplete) {
      var newNode = nodeFromJSON(value, priority);
      repo.server_.onDisconnectPut(path.toString(), newNode.val(true), function(status, errorReason) {
        if (status === "ok") {
          sparseSnapshotTreeRemember(repo.onDisconnect_, path, newNode);
        }
        repoCallOnCompleteCallback(repo, onComplete, status, errorReason);
      });
    }
    function repoOnDisconnectUpdate(repo, path, childrenToMerge, onComplete) {
      if (util.isEmpty(childrenToMerge)) {
        log("onDisconnect().update() called with empty data.  Don't do anything.");
        repoCallOnCompleteCallback(repo, onComplete, "ok", void 0);
        return;
      }
      repo.server_.onDisconnectMerge(path.toString(), childrenToMerge, function(status, errorReason) {
        if (status === "ok") {
          each(childrenToMerge, function(childName, childNode) {
            var newChildNode = nodeFromJSON(childNode);
            sparseSnapshotTreeRemember(repo.onDisconnect_, pathChild(path, childName), newChildNode);
          });
        }
        repoCallOnCompleteCallback(repo, onComplete, status, errorReason);
      });
    }
    function repoAddEventCallbackForQuery(repo, query2, eventRegistration) {
      var events;
      if (pathGetFront(query2._path) === ".info") {
        events = syncTreeAddEventRegistration(repo.infoSyncTree_, query2, eventRegistration);
      } else {
        events = syncTreeAddEventRegistration(repo.serverSyncTree_, query2, eventRegistration);
      }
      eventQueueRaiseEventsAtPath(repo.eventQueue_, query2._path, events);
    }
    function repoRemoveEventCallbackForQuery(repo, query2, eventRegistration) {
      var events;
      if (pathGetFront(query2._path) === ".info") {
        events = syncTreeRemoveEventRegistration(repo.infoSyncTree_, query2, eventRegistration);
      } else {
        events = syncTreeRemoveEventRegistration(repo.serverSyncTree_, query2, eventRegistration);
      }
      eventQueueRaiseEventsAtPath(repo.eventQueue_, query2._path, events);
    }
    function repoInterrupt(repo) {
      if (repo.persistentConnection_) {
        repo.persistentConnection_.interrupt(INTERRUPT_REASON);
      }
    }
    function repoResume(repo) {
      if (repo.persistentConnection_) {
        repo.persistentConnection_.resume(INTERRUPT_REASON);
      }
    }
    function repoStats(repo, showDelta) {
      if (showDelta === void 0) {
        showDelta = false;
      }
      if (typeof console === "undefined") {
        return;
      }
      var stats2;
      if (showDelta) {
        if (!repo.statsListener_) {
          repo.statsListener_ = new StatsListener(repo.stats_);
        }
        stats2 = repo.statsListener_.get();
      } else {
        stats2 = repo.stats_.get();
      }
      var longestName = Object.keys(stats2).reduce(function(previousValue, currentValue) {
        return Math.max(currentValue.length, previousValue);
      }, 0);
      each(stats2, function(stat, value) {
        var paddedStat = stat;
        for (var i = stat.length; i < longestName + 2; i++) {
          paddedStat += " ";
        }
        console.log(paddedStat + value);
      });
    }
    function repoStatsIncrementCounter(repo, metric) {
      repo.stats_.incrementCounter(metric);
      statsReporterIncludeStat(repo.statsReporter_, metric);
    }
    function repoLog(repo) {
      var varArgs = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        varArgs[_i - 1] = arguments[_i];
      }
      var prefix = "";
      if (repo.persistentConnection_) {
        prefix = repo.persistentConnection_.id + ":";
      }
      log.apply(void 0, tslib.__spreadArray([prefix], tslib.__read(varArgs)));
    }
    function repoCallOnCompleteCallback(repo, callback, status, errorReason) {
      if (callback) {
        exceptionGuard(function() {
          if (status === "ok") {
            callback(null);
          } else {
            var code = (status || "error").toUpperCase();
            var message = code;
            if (errorReason) {
              message += ": " + errorReason;
            }
            var error4 = new Error(message);
            error4.code = code;
            callback(error4);
          }
        });
      }
    }
    function repoStartTransaction(repo, path, transactionUpdate, onComplete, unwatcher, applyLocally) {
      repoLog(repo, "transaction on " + path);
      var transaction = {
        path,
        update: transactionUpdate,
        onComplete,
        status: null,
        order: LUIDGenerator(),
        applyLocally,
        retryCount: 0,
        unwatcher,
        abortReason: null,
        currentWriteId: null,
        currentInputSnapshot: null,
        currentOutputSnapshotRaw: null,
        currentOutputSnapshotResolved: null
      };
      var currentState = repoGetLatestState(repo, path, void 0);
      transaction.currentInputSnapshot = currentState;
      var newVal = transaction.update(currentState.val());
      if (newVal === void 0) {
        transaction.unwatcher();
        transaction.currentOutputSnapshotRaw = null;
        transaction.currentOutputSnapshotResolved = null;
        if (transaction.onComplete) {
          transaction.onComplete(null, false, transaction.currentInputSnapshot);
        }
      } else {
        validateFirebaseData("transaction failed: Data returned ", newVal, transaction.path);
        transaction.status = 0;
        var queueNode = treeSubTree(repo.transactionQueueTree_, path);
        var nodeQueue = treeGetValue(queueNode) || [];
        nodeQueue.push(transaction);
        treeSetValue(queueNode, nodeQueue);
        var priorityForNode = void 0;
        if (typeof newVal === "object" && newVal !== null && util.contains(newVal, ".priority")) {
          priorityForNode = util.safeGet(newVal, ".priority");
          util.assert(isValidPriority(priorityForNode), "Invalid priority returned by transaction. Priority must be a valid string, finite number, server value, or null.");
        } else {
          var currentNode = syncTreeCalcCompleteEventCache(repo.serverSyncTree_, path) || ChildrenNode.EMPTY_NODE;
          priorityForNode = currentNode.getPriority().val();
        }
        var serverValues = repoGenerateServerValues(repo);
        var newNodeUnresolved = nodeFromJSON(newVal, priorityForNode);
        var newNode = resolveDeferredValueSnapshot(newNodeUnresolved, currentState, serverValues);
        transaction.currentOutputSnapshotRaw = newNodeUnresolved;
        transaction.currentOutputSnapshotResolved = newNode;
        transaction.currentWriteId = repoGetNextWriteId(repo);
        var events = syncTreeApplyUserOverwrite(repo.serverSyncTree_, path, newNode, transaction.currentWriteId, transaction.applyLocally);
        eventQueueRaiseEventsForChangedPath(repo.eventQueue_, path, events);
        repoSendReadyTransactions(repo, repo.transactionQueueTree_);
      }
    }
    function repoGetLatestState(repo, path, excludeSets) {
      return syncTreeCalcCompleteEventCache(repo.serverSyncTree_, path, excludeSets) || ChildrenNode.EMPTY_NODE;
    }
    function repoSendReadyTransactions(repo, node) {
      if (node === void 0) {
        node = repo.transactionQueueTree_;
      }
      if (!node) {
        repoPruneCompletedTransactionsBelowNode(repo, node);
      }
      if (treeGetValue(node)) {
        var queue = repoBuildTransactionQueue(repo, node);
        util.assert(queue.length > 0, "Sending zero length transaction queue");
        var allRun = queue.every(function(transaction) {
          return transaction.status === 0;
        });
        if (allRun) {
          repoSendTransactionQueue(repo, treeGetPath(node), queue);
        }
      } else if (treeHasChildren(node)) {
        treeForEachChild(node, function(childNode) {
          repoSendReadyTransactions(repo, childNode);
        });
      }
    }
    function repoSendTransactionQueue(repo, path, queue) {
      var setsToIgnore = queue.map(function(txn2) {
        return txn2.currentWriteId;
      });
      var latestState = repoGetLatestState(repo, path, setsToIgnore);
      var snapToSend = latestState;
      var latestHash = latestState.hash();
      for (var i = 0; i < queue.length; i++) {
        var txn = queue[i];
        util.assert(txn.status === 0, "tryToSendTransactionQueue_: items in queue should all be run.");
        txn.status = 1;
        txn.retryCount++;
        var relativePath = newRelativePath(path, txn.path);
        snapToSend = snapToSend.updateChild(relativePath, txn.currentOutputSnapshotRaw);
      }
      var dataToSend = snapToSend.val(true);
      var pathToSend = path;
      repo.server_.put(pathToSend.toString(), dataToSend, function(status) {
        repoLog(repo, "transaction put response", {
          path: pathToSend.toString(),
          status
        });
        var events = [];
        if (status === "ok") {
          var callbacks = [];
          var _loop_1 = function(i3) {
            queue[i3].status = 2;
            events = events.concat(syncTreeAckUserWrite(repo.serverSyncTree_, queue[i3].currentWriteId));
            if (queue[i3].onComplete) {
              callbacks.push(function() {
                return queue[i3].onComplete(null, true, queue[i3].currentOutputSnapshotResolved);
              });
            }
            queue[i3].unwatcher();
          };
          for (var i2 = 0; i2 < queue.length; i2++) {
            _loop_1(i2);
          }
          repoPruneCompletedTransactionsBelowNode(repo, treeSubTree(repo.transactionQueueTree_, path));
          repoSendReadyTransactions(repo, repo.transactionQueueTree_);
          eventQueueRaiseEventsForChangedPath(repo.eventQueue_, path, events);
          for (var i2 = 0; i2 < callbacks.length; i2++) {
            exceptionGuard(callbacks[i2]);
          }
        } else {
          if (status === "datastale") {
            for (var i2 = 0; i2 < queue.length; i2++) {
              if (queue[i2].status === 3) {
                queue[i2].status = 4;
              } else {
                queue[i2].status = 0;
              }
            }
          } else {
            warn("transaction at " + pathToSend.toString() + " failed: " + status);
            for (var i2 = 0; i2 < queue.length; i2++) {
              queue[i2].status = 4;
              queue[i2].abortReason = status;
            }
          }
          repoRerunTransactions(repo, path);
        }
      }, latestHash);
    }
    function repoRerunTransactions(repo, changedPath) {
      var rootMostTransactionNode = repoGetAncestorTransactionNode(repo, changedPath);
      var path = treeGetPath(rootMostTransactionNode);
      var queue = repoBuildTransactionQueue(repo, rootMostTransactionNode);
      repoRerunTransactionQueue(repo, queue, path);
      return path;
    }
    function repoRerunTransactionQueue(repo, queue, path) {
      if (queue.length === 0) {
        return;
      }
      var callbacks = [];
      var events = [];
      var txnsToRerun = queue.filter(function(q) {
        return q.status === 0;
      });
      var setsToIgnore = txnsToRerun.map(function(q) {
        return q.currentWriteId;
      });
      var _loop_2 = function(i2) {
        var transaction = queue[i2];
        var relativePath = newRelativePath(path, transaction.path);
        var abortTransaction = false, abortReason;
        util.assert(relativePath !== null, "rerunTransactionsUnderNode_: relativePath should not be null.");
        if (transaction.status === 4) {
          abortTransaction = true;
          abortReason = transaction.abortReason;
          events = events.concat(syncTreeAckUserWrite(repo.serverSyncTree_, transaction.currentWriteId, true));
        } else if (transaction.status === 0) {
          if (transaction.retryCount >= MAX_TRANSACTION_RETRIES) {
            abortTransaction = true;
            abortReason = "maxretry";
            events = events.concat(syncTreeAckUserWrite(repo.serverSyncTree_, transaction.currentWriteId, true));
          } else {
            var currentNode = repoGetLatestState(repo, transaction.path, setsToIgnore);
            transaction.currentInputSnapshot = currentNode;
            var newData = queue[i2].update(currentNode.val());
            if (newData !== void 0) {
              validateFirebaseData("transaction failed: Data returned ", newData, transaction.path);
              var newDataNode = nodeFromJSON(newData);
              var hasExplicitPriority = typeof newData === "object" && newData != null && util.contains(newData, ".priority");
              if (!hasExplicitPriority) {
                newDataNode = newDataNode.updatePriority(currentNode.getPriority());
              }
              var oldWriteId = transaction.currentWriteId;
              var serverValues = repoGenerateServerValues(repo);
              var newNodeResolved = resolveDeferredValueSnapshot(newDataNode, currentNode, serverValues);
              transaction.currentOutputSnapshotRaw = newDataNode;
              transaction.currentOutputSnapshotResolved = newNodeResolved;
              transaction.currentWriteId = repoGetNextWriteId(repo);
              setsToIgnore.splice(setsToIgnore.indexOf(oldWriteId), 1);
              events = events.concat(syncTreeApplyUserOverwrite(repo.serverSyncTree_, transaction.path, newNodeResolved, transaction.currentWriteId, transaction.applyLocally));
              events = events.concat(syncTreeAckUserWrite(repo.serverSyncTree_, oldWriteId, true));
            } else {
              abortTransaction = true;
              abortReason = "nodata";
              events = events.concat(syncTreeAckUserWrite(repo.serverSyncTree_, transaction.currentWriteId, true));
            }
          }
        }
        eventQueueRaiseEventsForChangedPath(repo.eventQueue_, path, events);
        events = [];
        if (abortTransaction) {
          queue[i2].status = 2;
          (function(unwatcher) {
            setTimeout(unwatcher, Math.floor(0));
          })(queue[i2].unwatcher);
          if (queue[i2].onComplete) {
            if (abortReason === "nodata") {
              callbacks.push(function() {
                return queue[i2].onComplete(null, false, queue[i2].currentInputSnapshot);
              });
            } else {
              callbacks.push(function() {
                return queue[i2].onComplete(new Error(abortReason), false, null);
              });
            }
          }
        }
      };
      for (var i = 0; i < queue.length; i++) {
        _loop_2(i);
      }
      repoPruneCompletedTransactionsBelowNode(repo, repo.transactionQueueTree_);
      for (var i = 0; i < callbacks.length; i++) {
        exceptionGuard(callbacks[i]);
      }
      repoSendReadyTransactions(repo, repo.transactionQueueTree_);
    }
    function repoGetAncestorTransactionNode(repo, path) {
      var front;
      var transactionNode = repo.transactionQueueTree_;
      front = pathGetFront(path);
      while (front !== null && treeGetValue(transactionNode) === void 0) {
        transactionNode = treeSubTree(transactionNode, front);
        path = pathPopFront(path);
        front = pathGetFront(path);
      }
      return transactionNode;
    }
    function repoBuildTransactionQueue(repo, transactionNode) {
      var transactionQueue = [];
      repoAggregateTransactionQueuesForNode(repo, transactionNode, transactionQueue);
      transactionQueue.sort(function(a, b) {
        return a.order - b.order;
      });
      return transactionQueue;
    }
    function repoAggregateTransactionQueuesForNode(repo, node, queue) {
      var nodeQueue = treeGetValue(node);
      if (nodeQueue) {
        for (var i = 0; i < nodeQueue.length; i++) {
          queue.push(nodeQueue[i]);
        }
      }
      treeForEachChild(node, function(child2) {
        repoAggregateTransactionQueuesForNode(repo, child2, queue);
      });
    }
    function repoPruneCompletedTransactionsBelowNode(repo, node) {
      var queue = treeGetValue(node);
      if (queue) {
        var to = 0;
        for (var from = 0; from < queue.length; from++) {
          if (queue[from].status !== 2) {
            queue[to] = queue[from];
            to++;
          }
        }
        queue.length = to;
        treeSetValue(node, queue.length > 0 ? queue : void 0);
      }
      treeForEachChild(node, function(childNode) {
        repoPruneCompletedTransactionsBelowNode(repo, childNode);
      });
    }
    function repoAbortTransactions(repo, path) {
      var affectedPath = treeGetPath(repoGetAncestorTransactionNode(repo, path));
      var transactionNode = treeSubTree(repo.transactionQueueTree_, path);
      treeForEachAncestor(transactionNode, function(node) {
        repoAbortTransactionsOnNode(repo, node);
      });
      repoAbortTransactionsOnNode(repo, transactionNode);
      treeForEachDescendant(transactionNode, function(node) {
        repoAbortTransactionsOnNode(repo, node);
      });
      return affectedPath;
    }
    function repoAbortTransactionsOnNode(repo, node) {
      var queue = treeGetValue(node);
      if (queue) {
        var callbacks = [];
        var events = [];
        var lastSent = -1;
        for (var i = 0; i < queue.length; i++) {
          if (queue[i].status === 3)
            ;
          else if (queue[i].status === 1) {
            util.assert(lastSent === i - 1, "All SENT items should be at beginning of queue.");
            lastSent = i;
            queue[i].status = 3;
            queue[i].abortReason = "set";
          } else {
            util.assert(queue[i].status === 0, "Unexpected transaction status in abort");
            queue[i].unwatcher();
            events = events.concat(syncTreeAckUserWrite(repo.serverSyncTree_, queue[i].currentWriteId, true));
            if (queue[i].onComplete) {
              callbacks.push(queue[i].onComplete.bind(null, new Error("set"), false, null));
            }
          }
        }
        if (lastSent === -1) {
          treeSetValue(node, void 0);
        } else {
          queue.length = lastSent + 1;
        }
        eventQueueRaiseEventsForChangedPath(repo.eventQueue_, treeGetPath(node), events);
        for (var i = 0; i < callbacks.length; i++) {
          exceptionGuard(callbacks[i]);
        }
      }
    }
    function decodePath(pathString) {
      var pathStringDecoded = "";
      var pieces = pathString.split("/");
      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i].length > 0) {
          var piece = pieces[i];
          try {
            piece = decodeURIComponent(piece.replace(/\+/g, " "));
          } catch (e) {
          }
          pathStringDecoded += "/" + piece;
        }
      }
      return pathStringDecoded;
    }
    function decodeQuery(queryString) {
      var e_1, _a;
      var results = {};
      if (queryString.charAt(0) === "?") {
        queryString = queryString.substring(1);
      }
      try {
        for (var _b = tslib.__values(queryString.split("&")), _c = _b.next(); !_c.done; _c = _b.next()) {
          var segment = _c.value;
          if (segment.length === 0) {
            continue;
          }
          var kv = segment.split("=");
          if (kv.length === 2) {
            results[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
          } else {
            warn("Invalid query segment '" + segment + "' in query '" + queryString + "'");
          }
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return))
            _a.call(_b);
        } finally {
          if (e_1)
            throw e_1.error;
        }
      }
      return results;
    }
    var parseRepoInfo = function(dataURL, nodeAdmin) {
      var parsedUrl = parseDatabaseURL(dataURL), namespace = parsedUrl.namespace;
      if (parsedUrl.domain === "firebase.com") {
        fatal(parsedUrl.host + " is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead");
      }
      if ((!namespace || namespace === "undefined") && parsedUrl.domain !== "localhost") {
        fatal("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com");
      }
      if (!parsedUrl.secure) {
        warnIfPageIsSecure();
      }
      var webSocketOnly = parsedUrl.scheme === "ws" || parsedUrl.scheme === "wss";
      return {
        repoInfo: new RepoInfo(parsedUrl.host, parsedUrl.secure, namespace, nodeAdmin, webSocketOnly, "", namespace !== parsedUrl.subdomain),
        path: new Path(parsedUrl.pathString)
      };
    };
    var parseDatabaseURL = function(dataURL) {
      var host = "", domain = "", subdomain = "", pathString = "", namespace = "";
      var secure = true, scheme = "https", port = 443;
      if (typeof dataURL === "string") {
        var colonInd = dataURL.indexOf("//");
        if (colonInd >= 0) {
          scheme = dataURL.substring(0, colonInd - 1);
          dataURL = dataURL.substring(colonInd + 2);
        }
        var slashInd = dataURL.indexOf("/");
        if (slashInd === -1) {
          slashInd = dataURL.length;
        }
        var questionMarkInd = dataURL.indexOf("?");
        if (questionMarkInd === -1) {
          questionMarkInd = dataURL.length;
        }
        host = dataURL.substring(0, Math.min(slashInd, questionMarkInd));
        if (slashInd < questionMarkInd) {
          pathString = decodePath(dataURL.substring(slashInd, questionMarkInd));
        }
        var queryParams = decodeQuery(dataURL.substring(Math.min(dataURL.length, questionMarkInd)));
        colonInd = host.indexOf(":");
        if (colonInd >= 0) {
          secure = scheme === "https" || scheme === "wss";
          port = parseInt(host.substring(colonInd + 1), 10);
        } else {
          colonInd = host.length;
        }
        var hostWithoutPort = host.slice(0, colonInd);
        if (hostWithoutPort.toLowerCase() === "localhost") {
          domain = "localhost";
        } else if (hostWithoutPort.split(".").length <= 2) {
          domain = hostWithoutPort;
        } else {
          var dotInd = host.indexOf(".");
          subdomain = host.substring(0, dotInd).toLowerCase();
          domain = host.substring(dotInd + 1);
          namespace = subdomain;
        }
        if ("ns" in queryParams) {
          namespace = queryParams["ns"];
        }
      }
      return {
        host,
        port,
        domain,
        subdomain,
        secure,
        scheme,
        pathString,
        namespace
      };
    };
    var DataEvent = function() {
      function DataEvent2(eventType, eventRegistration, snapshot, prevName) {
        this.eventType = eventType;
        this.eventRegistration = eventRegistration;
        this.snapshot = snapshot;
        this.prevName = prevName;
      }
      DataEvent2.prototype.getPath = function() {
        var ref2 = this.snapshot.ref;
        if (this.eventType === "value") {
          return ref2._path;
        } else {
          return ref2.parent._path;
        }
      };
      DataEvent2.prototype.getEventType = function() {
        return this.eventType;
      };
      DataEvent2.prototype.getEventRunner = function() {
        return this.eventRegistration.getEventRunner(this);
      };
      DataEvent2.prototype.toString = function() {
        return this.getPath().toString() + ":" + this.eventType + ":" + util.stringify(this.snapshot.exportVal());
      };
      return DataEvent2;
    }();
    var CancelEvent = function() {
      function CancelEvent2(eventRegistration, error4, path) {
        this.eventRegistration = eventRegistration;
        this.error = error4;
        this.path = path;
      }
      CancelEvent2.prototype.getPath = function() {
        return this.path;
      };
      CancelEvent2.prototype.getEventType = function() {
        return "cancel";
      };
      CancelEvent2.prototype.getEventRunner = function() {
        return this.eventRegistration.getEventRunner(this);
      };
      CancelEvent2.prototype.toString = function() {
        return this.path.toString() + ":cancel";
      };
      return CancelEvent2;
    }();
    var CallbackContext = function() {
      function CallbackContext2(snapshotCallback, cancelCallback) {
        this.snapshotCallback = snapshotCallback;
        this.cancelCallback = cancelCallback;
      }
      CallbackContext2.prototype.onValue = function(expDataSnapshot, previousChildName) {
        this.snapshotCallback.call(null, expDataSnapshot, previousChildName);
      };
      CallbackContext2.prototype.onCancel = function(error4) {
        util.assert(this.hasCancelCallback, "Raising a cancel event on a listener with no cancel callback");
        return this.cancelCallback.call(null, error4);
      };
      Object.defineProperty(CallbackContext2.prototype, "hasCancelCallback", {
        get: function() {
          return !!this.cancelCallback;
        },
        enumerable: false,
        configurable: true
      });
      CallbackContext2.prototype.matches = function(other) {
        return this.snapshotCallback === other.snapshotCallback || this.snapshotCallback.userCallback === other.snapshotCallback.userCallback && this.snapshotCallback.context === other.snapshotCallback.context;
      };
      return CallbackContext2;
    }();
    var OnDisconnect$1 = function() {
      function OnDisconnect2(_repo, _path) {
        this._repo = _repo;
        this._path = _path;
      }
      OnDisconnect2.prototype.cancel = function() {
        var deferred = new util.Deferred();
        repoOnDisconnectCancel(this._repo, this._path, deferred.wrapCallback(function() {
        }));
        return deferred.promise;
      };
      OnDisconnect2.prototype.remove = function() {
        validateWritablePath("OnDisconnect.remove", this._path);
        var deferred = new util.Deferred();
        repoOnDisconnectSet(this._repo, this._path, null, deferred.wrapCallback(function() {
        }));
        return deferred.promise;
      };
      OnDisconnect2.prototype.set = function(value) {
        validateWritablePath("OnDisconnect.set", this._path);
        validateFirebaseDataArg("OnDisconnect.set", value, this._path, false);
        var deferred = new util.Deferred();
        repoOnDisconnectSet(this._repo, this._path, value, deferred.wrapCallback(function() {
        }));
        return deferred.promise;
      };
      OnDisconnect2.prototype.setWithPriority = function(value, priority) {
        validateWritablePath("OnDisconnect.setWithPriority", this._path);
        validateFirebaseDataArg("OnDisconnect.setWithPriority", value, this._path, false);
        validatePriority("OnDisconnect.setWithPriority", priority, false);
        var deferred = new util.Deferred();
        repoOnDisconnectSetWithPriority(this._repo, this._path, value, priority, deferred.wrapCallback(function() {
        }));
        return deferred.promise;
      };
      OnDisconnect2.prototype.update = function(values) {
        validateWritablePath("OnDisconnect.update", this._path);
        validateFirebaseMergeDataArg("OnDisconnect.update", values, this._path, false);
        var deferred = new util.Deferred();
        repoOnDisconnectUpdate(this._repo, this._path, values, deferred.wrapCallback(function() {
        }));
        return deferred.promise;
      };
      return OnDisconnect2;
    }();
    var QueryImpl = function() {
      function QueryImpl2(_repo, _path, _queryParams, _orderByCalled) {
        this._repo = _repo;
        this._path = _path;
        this._queryParams = _queryParams;
        this._orderByCalled = _orderByCalled;
      }
      Object.defineProperty(QueryImpl2.prototype, "key", {
        get: function() {
          if (pathIsEmpty(this._path)) {
            return null;
          } else {
            return pathGetBack(this._path);
          }
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(QueryImpl2.prototype, "ref", {
        get: function() {
          return new ReferenceImpl(this._repo, this._path);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(QueryImpl2.prototype, "_queryIdentifier", {
        get: function() {
          var obj = queryParamsGetQueryObject(this._queryParams);
          var id = ObjectToUniqueKey(obj);
          return id === "{}" ? "default" : id;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(QueryImpl2.prototype, "_queryObject", {
        get: function() {
          return queryParamsGetQueryObject(this._queryParams);
        },
        enumerable: false,
        configurable: true
      });
      QueryImpl2.prototype.isEqual = function(other) {
        other = util.getModularInstance(other);
        if (!(other instanceof QueryImpl2)) {
          return false;
        }
        var sameRepo = this._repo === other._repo;
        var samePath = pathEquals(this._path, other._path);
        var sameQueryIdentifier = this._queryIdentifier === other._queryIdentifier;
        return sameRepo && samePath && sameQueryIdentifier;
      };
      QueryImpl2.prototype.toJSON = function() {
        return this.toString();
      };
      QueryImpl2.prototype.toString = function() {
        return this._repo.toString() + pathToUrlEncodedString(this._path);
      };
      return QueryImpl2;
    }();
    function validateNoPreviousOrderByCall(query2, fnName) {
      if (query2._orderByCalled === true) {
        throw new Error(fnName + ": You can't combine multiple orderBy calls.");
      }
    }
    function validateQueryEndpoints(params) {
      var startNode = null;
      var endNode = null;
      if (params.hasStart()) {
        startNode = params.getIndexStartValue();
      }
      if (params.hasEnd()) {
        endNode = params.getIndexEndValue();
      }
      if (params.getIndex() === KEY_INDEX) {
        var tooManyArgsError = "Query: When ordering by key, you may only pass one argument to startAt(), endAt(), or equalTo().";
        var wrongArgTypeError = "Query: When ordering by key, the argument passed to startAt(), startAfter(), endAt(), endBefore(), or equalTo() must be a string.";
        if (params.hasStart()) {
          var startName = params.getIndexStartName();
          if (startName !== MIN_NAME) {
            throw new Error(tooManyArgsError);
          } else if (typeof startNode !== "string") {
            throw new Error(wrongArgTypeError);
          }
        }
        if (params.hasEnd()) {
          var endName = params.getIndexEndName();
          if (endName !== MAX_NAME) {
            throw new Error(tooManyArgsError);
          } else if (typeof endNode !== "string") {
            throw new Error(wrongArgTypeError);
          }
        }
      } else if (params.getIndex() === PRIORITY_INDEX) {
        if (startNode != null && !isValidPriority(startNode) || endNode != null && !isValidPriority(endNode)) {
          throw new Error("Query: When ordering by priority, the first argument passed to startAt(), startAfter() endAt(), endBefore(), or equalTo() must be a valid priority value (null, a number, or a string).");
        }
      } else {
        util.assert(params.getIndex() instanceof PathIndex || params.getIndex() === VALUE_INDEX, "unknown index type.");
        if (startNode != null && typeof startNode === "object" || endNode != null && typeof endNode === "object") {
          throw new Error("Query: First argument passed to startAt(), startAfter(), endAt(), endBefore(), or equalTo() cannot be an object.");
        }
      }
    }
    function validateLimit(params) {
      if (params.hasStart() && params.hasEnd() && params.hasLimit() && !params.hasAnchoredLimit()) {
        throw new Error("Query: Can't combine startAt(), startAfter(), endAt(), endBefore(), and limit(). Use limitToFirst() or limitToLast() instead.");
      }
    }
    var ReferenceImpl = function(_super) {
      tslib.__extends(ReferenceImpl2, _super);
      function ReferenceImpl2(repo, path) {
        return _super.call(this, repo, path, new QueryParams(), false) || this;
      }
      Object.defineProperty(ReferenceImpl2.prototype, "parent", {
        get: function() {
          var parentPath = pathParent(this._path);
          return parentPath === null ? null : new ReferenceImpl2(this._repo, parentPath);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(ReferenceImpl2.prototype, "root", {
        get: function() {
          var ref2 = this;
          while (ref2.parent !== null) {
            ref2 = ref2.parent;
          }
          return ref2;
        },
        enumerable: false,
        configurable: true
      });
      return ReferenceImpl2;
    }(QueryImpl);
    var DataSnapshot$1 = function() {
      function DataSnapshot2(_node, ref2, _index) {
        this._node = _node;
        this.ref = ref2;
        this._index = _index;
      }
      Object.defineProperty(DataSnapshot2.prototype, "priority", {
        get: function() {
          return this._node.getPriority().val();
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(DataSnapshot2.prototype, "key", {
        get: function() {
          return this.ref.key;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(DataSnapshot2.prototype, "size", {
        get: function() {
          return this._node.numChildren();
        },
        enumerable: false,
        configurable: true
      });
      DataSnapshot2.prototype.child = function(path) {
        var childPath = new Path(path);
        var childRef = child(this.ref, path);
        return new DataSnapshot2(this._node.getChild(childPath), childRef, PRIORITY_INDEX);
      };
      DataSnapshot2.prototype.exists = function() {
        return !this._node.isEmpty();
      };
      DataSnapshot2.prototype.exportVal = function() {
        return this._node.val(true);
      };
      DataSnapshot2.prototype.forEach = function(action) {
        var _this = this;
        if (this._node.isLeafNode()) {
          return false;
        }
        var childrenNode = this._node;
        return !!childrenNode.forEachChild(this._index, function(key, node) {
          return action(new DataSnapshot2(node, child(_this.ref, key), PRIORITY_INDEX));
        });
      };
      DataSnapshot2.prototype.hasChild = function(path) {
        var childPath = new Path(path);
        return !this._node.getChild(childPath).isEmpty();
      };
      DataSnapshot2.prototype.hasChildren = function() {
        if (this._node.isLeafNode()) {
          return false;
        } else {
          return !this._node.isEmpty();
        }
      };
      DataSnapshot2.prototype.toJSON = function() {
        return this.exportVal();
      };
      DataSnapshot2.prototype.val = function() {
        return this._node.val();
      };
      return DataSnapshot2;
    }();
    function ref(db, path) {
      db = util.getModularInstance(db);
      db._checkNotDeleted("ref");
      return path !== void 0 ? child(db._root, path) : db._root;
    }
    function refFromURL(db, url) {
      db = util.getModularInstance(db);
      db._checkNotDeleted("refFromURL");
      var parsedURL = parseRepoInfo(url, db._repo.repoInfo_.nodeAdmin);
      validateUrl("refFromURL", parsedURL);
      var repoInfo = parsedURL.repoInfo;
      if (!db._repo.repoInfo_.isCustomHost() && repoInfo.host !== db._repo.repoInfo_.host) {
        fatal("refFromURL: Host name does not match the current database: (found " + repoInfo.host + " but expected " + db._repo.repoInfo_.host + ")");
      }
      return ref(db, parsedURL.path.toString());
    }
    function child(parent, path) {
      parent = util.getModularInstance(parent);
      if (pathGetFront(parent._path) === null) {
        validateRootPathString("child", "path", path, false);
      } else {
        validatePathString("child", "path", path, false);
      }
      return new ReferenceImpl(parent._repo, pathChild(parent._path, path));
    }
    function push(parent, value) {
      parent = util.getModularInstance(parent);
      validateWritablePath("push", parent._path);
      validateFirebaseDataArg("push", value, parent._path, true);
      var now = repoServerTime(parent._repo);
      var name2 = nextPushId(now);
      var thennablePushRef = child(parent, name2);
      var pushRef = child(parent, name2);
      var promise;
      if (value != null) {
        promise = set(pushRef, value).then(function() {
          return pushRef;
        });
      } else {
        promise = Promise.resolve(pushRef);
      }
      thennablePushRef.then = promise.then.bind(promise);
      thennablePushRef.catch = promise.then.bind(promise, void 0);
      return thennablePushRef;
    }
    function remove(ref2) {
      validateWritablePath("remove", ref2._path);
      return set(ref2, null);
    }
    function set(ref2, value) {
      ref2 = util.getModularInstance(ref2);
      validateWritablePath("set", ref2._path);
      validateFirebaseDataArg("set", value, ref2._path, false);
      var deferred = new util.Deferred();
      repoSetWithPriority(ref2._repo, ref2._path, value, null, deferred.wrapCallback(function() {
      }));
      return deferred.promise;
    }
    function setPriority(ref2, priority) {
      ref2 = util.getModularInstance(ref2);
      validateWritablePath("setPriority", ref2._path);
      validatePriority("setPriority", priority, false);
      var deferred = new util.Deferred();
      repoSetWithPriority(ref2._repo, pathChild(ref2._path, ".priority"), priority, null, deferred.wrapCallback(function() {
      }));
      return deferred.promise;
    }
    function setWithPriority(ref2, value, priority) {
      validateWritablePath("setWithPriority", ref2._path);
      validateFirebaseDataArg("setWithPriority", value, ref2._path, false);
      validatePriority("setWithPriority", priority, false);
      if (ref2.key === ".length" || ref2.key === ".keys") {
        throw "setWithPriority failed: " + ref2.key + " is a read-only object.";
      }
      var deferred = new util.Deferred();
      repoSetWithPriority(ref2._repo, ref2._path, value, priority, deferred.wrapCallback(function() {
      }));
      return deferred.promise;
    }
    function update(ref2, values) {
      validateFirebaseMergeDataArg("update", values, ref2._path, false);
      var deferred = new util.Deferred();
      repoUpdate(ref2._repo, ref2._path, values, deferred.wrapCallback(function() {
      }));
      return deferred.promise;
    }
    function get(query2) {
      query2 = util.getModularInstance(query2);
      return repoGetValue(query2._repo, query2).then(function(node) {
        return new DataSnapshot$1(node, new ReferenceImpl(query2._repo, query2._path), query2._queryParams.getIndex());
      });
    }
    var ValueEventRegistration = function() {
      function ValueEventRegistration2(callbackContext) {
        this.callbackContext = callbackContext;
      }
      ValueEventRegistration2.prototype.respondsTo = function(eventType) {
        return eventType === "value";
      };
      ValueEventRegistration2.prototype.createEvent = function(change, query2) {
        var index2 = query2._queryParams.getIndex();
        return new DataEvent("value", this, new DataSnapshot$1(change.snapshotNode, new ReferenceImpl(query2._repo, query2._path), index2));
      };
      ValueEventRegistration2.prototype.getEventRunner = function(eventData) {
        var _this = this;
        if (eventData.getEventType() === "cancel") {
          return function() {
            return _this.callbackContext.onCancel(eventData.error);
          };
        } else {
          return function() {
            return _this.callbackContext.onValue(eventData.snapshot, null);
          };
        }
      };
      ValueEventRegistration2.prototype.createCancelEvent = function(error4, path) {
        if (this.callbackContext.hasCancelCallback) {
          return new CancelEvent(this, error4, path);
        } else {
          return null;
        }
      };
      ValueEventRegistration2.prototype.matches = function(other) {
        if (!(other instanceof ValueEventRegistration2)) {
          return false;
        } else if (!other.callbackContext || !this.callbackContext) {
          return true;
        } else {
          return other.callbackContext.matches(this.callbackContext);
        }
      };
      ValueEventRegistration2.prototype.hasAnyCallback = function() {
        return this.callbackContext !== null;
      };
      return ValueEventRegistration2;
    }();
    var ChildEventRegistration = function() {
      function ChildEventRegistration2(eventType, callbackContext) {
        this.eventType = eventType;
        this.callbackContext = callbackContext;
      }
      ChildEventRegistration2.prototype.respondsTo = function(eventType) {
        var eventToCheck = eventType === "children_added" ? "child_added" : eventType;
        eventToCheck = eventToCheck === "children_removed" ? "child_removed" : eventToCheck;
        return this.eventType === eventToCheck;
      };
      ChildEventRegistration2.prototype.createCancelEvent = function(error4, path) {
        if (this.callbackContext.hasCancelCallback) {
          return new CancelEvent(this, error4, path);
        } else {
          return null;
        }
      };
      ChildEventRegistration2.prototype.createEvent = function(change, query2) {
        util.assert(change.childName != null, "Child events should have a childName.");
        var childRef = child(new ReferenceImpl(query2._repo, query2._path), change.childName);
        var index2 = query2._queryParams.getIndex();
        return new DataEvent(change.type, this, new DataSnapshot$1(change.snapshotNode, childRef, index2), change.prevName);
      };
      ChildEventRegistration2.prototype.getEventRunner = function(eventData) {
        var _this = this;
        if (eventData.getEventType() === "cancel") {
          return function() {
            return _this.callbackContext.onCancel(eventData.error);
          };
        } else {
          return function() {
            return _this.callbackContext.onValue(eventData.snapshot, eventData.prevName);
          };
        }
      };
      ChildEventRegistration2.prototype.matches = function(other) {
        if (other instanceof ChildEventRegistration2) {
          return this.eventType === other.eventType && (!this.callbackContext || !other.callbackContext || this.callbackContext.matches(other.callbackContext));
        }
        return false;
      };
      ChildEventRegistration2.prototype.hasAnyCallback = function() {
        return !!this.callbackContext;
      };
      return ChildEventRegistration2;
    }();
    function addEventListener(query2, eventType, callback, cancelCallbackOrListenOptions, options2) {
      var cancelCallback;
      if (typeof cancelCallbackOrListenOptions === "object") {
        cancelCallback = void 0;
        options2 = cancelCallbackOrListenOptions;
      }
      if (typeof cancelCallbackOrListenOptions === "function") {
        cancelCallback = cancelCallbackOrListenOptions;
      }
      if (options2 && options2.onlyOnce) {
        var userCallback_1 = callback;
        var onceCallback = function(dataSnapshot, previousChildName) {
          repoRemoveEventCallbackForQuery(query2._repo, query2, container);
          userCallback_1(dataSnapshot, previousChildName);
        };
        onceCallback.userCallback = callback.userCallback;
        onceCallback.context = callback.context;
        callback = onceCallback;
      }
      var callbackContext = new CallbackContext(callback, cancelCallback || void 0);
      var container = eventType === "value" ? new ValueEventRegistration(callbackContext) : new ChildEventRegistration(eventType, callbackContext);
      repoAddEventCallbackForQuery(query2._repo, query2, container);
      return function() {
        return repoRemoveEventCallbackForQuery(query2._repo, query2, container);
      };
    }
    function onValue(query2, callback, cancelCallbackOrListenOptions, options2) {
      return addEventListener(query2, "value", callback, cancelCallbackOrListenOptions, options2);
    }
    function onChildAdded(query2, callback, cancelCallbackOrListenOptions, options2) {
      return addEventListener(query2, "child_added", callback, cancelCallbackOrListenOptions, options2);
    }
    function onChildChanged(query2, callback, cancelCallbackOrListenOptions, options2) {
      return addEventListener(query2, "child_changed", callback, cancelCallbackOrListenOptions, options2);
    }
    function onChildMoved(query2, callback, cancelCallbackOrListenOptions, options2) {
      return addEventListener(query2, "child_moved", callback, cancelCallbackOrListenOptions, options2);
    }
    function onChildRemoved(query2, callback, cancelCallbackOrListenOptions, options2) {
      return addEventListener(query2, "child_removed", callback, cancelCallbackOrListenOptions, options2);
    }
    function off(query2, eventType, callback) {
      var container = null;
      var expCallback = callback ? new CallbackContext(callback) : null;
      if (eventType === "value") {
        container = new ValueEventRegistration(expCallback);
      } else if (eventType) {
        container = new ChildEventRegistration(eventType, expCallback);
      }
      repoRemoveEventCallbackForQuery(query2._repo, query2, container);
    }
    var QueryConstraint = function() {
      function QueryConstraint2() {
      }
      return QueryConstraint2;
    }();
    var QueryEndAtConstraint = function(_super) {
      tslib.__extends(QueryEndAtConstraint2, _super);
      function QueryEndAtConstraint2(_value, _key) {
        var _this = _super.call(this) || this;
        _this._value = _value;
        _this._key = _key;
        return _this;
      }
      QueryEndAtConstraint2.prototype._apply = function(query2) {
        validateFirebaseDataArg("endAt", this._value, query2._path, true);
        var newParams = queryParamsEndAt(query2._queryParams, this._value, this._key);
        validateLimit(newParams);
        validateQueryEndpoints(newParams);
        if (query2._queryParams.hasEnd()) {
          throw new Error("endAt: Starting point was already set (by another call to endAt, endBefore or equalTo).");
        }
        return new QueryImpl(query2._repo, query2._path, newParams, query2._orderByCalled);
      };
      return QueryEndAtConstraint2;
    }(QueryConstraint);
    function endAt(value, key) {
      validateKey("endAt", "key", key, true);
      return new QueryEndAtConstraint(value, key);
    }
    var QueryEndBeforeConstraint = function(_super) {
      tslib.__extends(QueryEndBeforeConstraint2, _super);
      function QueryEndBeforeConstraint2(_value, _key) {
        var _this = _super.call(this) || this;
        _this._value = _value;
        _this._key = _key;
        return _this;
      }
      QueryEndBeforeConstraint2.prototype._apply = function(query2) {
        validateFirebaseDataArg("endBefore", this._value, query2._path, false);
        var newParams = queryParamsEndBefore(query2._queryParams, this._value, this._key);
        validateLimit(newParams);
        validateQueryEndpoints(newParams);
        if (query2._queryParams.hasEnd()) {
          throw new Error("endBefore: Starting point was already set (by another call to endAt, endBefore or equalTo).");
        }
        return new QueryImpl(query2._repo, query2._path, newParams, query2._orderByCalled);
      };
      return QueryEndBeforeConstraint2;
    }(QueryConstraint);
    function endBefore(value, key) {
      validateKey("endBefore", "key", key, true);
      return new QueryEndBeforeConstraint(value, key);
    }
    var QueryStartAtConstraint = function(_super) {
      tslib.__extends(QueryStartAtConstraint2, _super);
      function QueryStartAtConstraint2(_value, _key) {
        var _this = _super.call(this) || this;
        _this._value = _value;
        _this._key = _key;
        return _this;
      }
      QueryStartAtConstraint2.prototype._apply = function(query2) {
        validateFirebaseDataArg("startAt", this._value, query2._path, true);
        var newParams = queryParamsStartAt(query2._queryParams, this._value, this._key);
        validateLimit(newParams);
        validateQueryEndpoints(newParams);
        if (query2._queryParams.hasStart()) {
          throw new Error("startAt: Starting point was already set (by another call to startAt, startBefore or equalTo).");
        }
        return new QueryImpl(query2._repo, query2._path, newParams, query2._orderByCalled);
      };
      return QueryStartAtConstraint2;
    }(QueryConstraint);
    function startAt(value, key) {
      if (value === void 0) {
        value = null;
      }
      validateKey("startAt", "key", key, true);
      return new QueryStartAtConstraint(value, key);
    }
    var QueryStartAfterConstraint = function(_super) {
      tslib.__extends(QueryStartAfterConstraint2, _super);
      function QueryStartAfterConstraint2(_value, _key) {
        var _this = _super.call(this) || this;
        _this._value = _value;
        _this._key = _key;
        return _this;
      }
      QueryStartAfterConstraint2.prototype._apply = function(query2) {
        validateFirebaseDataArg("startAfter", this._value, query2._path, false);
        var newParams = queryParamsStartAfter(query2._queryParams, this._value, this._key);
        validateLimit(newParams);
        validateQueryEndpoints(newParams);
        if (query2._queryParams.hasStart()) {
          throw new Error("startAfter: Starting point was already set (by another call to startAt, startAfter, or equalTo).");
        }
        return new QueryImpl(query2._repo, query2._path, newParams, query2._orderByCalled);
      };
      return QueryStartAfterConstraint2;
    }(QueryConstraint);
    function startAfter(value, key) {
      validateKey("startAfter", "key", key, true);
      return new QueryStartAfterConstraint(value, key);
    }
    var QueryLimitToFirstConstraint = function(_super) {
      tslib.__extends(QueryLimitToFirstConstraint2, _super);
      function QueryLimitToFirstConstraint2(_limit) {
        var _this = _super.call(this) || this;
        _this._limit = _limit;
        return _this;
      }
      QueryLimitToFirstConstraint2.prototype._apply = function(query2) {
        if (query2._queryParams.hasLimit()) {
          throw new Error("limitToFirst: Limit was already set (by another call to limitToFirst or limitToLast).");
        }
        return new QueryImpl(query2._repo, query2._path, queryParamsLimitToFirst(query2._queryParams, this._limit), query2._orderByCalled);
      };
      return QueryLimitToFirstConstraint2;
    }(QueryConstraint);
    function limitToFirst(limit) {
      if (typeof limit !== "number" || Math.floor(limit) !== limit || limit <= 0) {
        throw new Error("limitToFirst: First argument must be a positive integer.");
      }
      return new QueryLimitToFirstConstraint(limit);
    }
    var QueryLimitToLastConstraint = function(_super) {
      tslib.__extends(QueryLimitToLastConstraint2, _super);
      function QueryLimitToLastConstraint2(_limit) {
        var _this = _super.call(this) || this;
        _this._limit = _limit;
        return _this;
      }
      QueryLimitToLastConstraint2.prototype._apply = function(query2) {
        if (query2._queryParams.hasLimit()) {
          throw new Error("limitToLast: Limit was already set (by another call to limitToFirst or limitToLast).");
        }
        return new QueryImpl(query2._repo, query2._path, queryParamsLimitToLast(query2._queryParams, this._limit), query2._orderByCalled);
      };
      return QueryLimitToLastConstraint2;
    }(QueryConstraint);
    function limitToLast(limit) {
      if (typeof limit !== "number" || Math.floor(limit) !== limit || limit <= 0) {
        throw new Error("limitToLast: First argument must be a positive integer.");
      }
      return new QueryLimitToLastConstraint(limit);
    }
    var QueryOrderByChildConstraint = function(_super) {
      tslib.__extends(QueryOrderByChildConstraint2, _super);
      function QueryOrderByChildConstraint2(_path) {
        var _this = _super.call(this) || this;
        _this._path = _path;
        return _this;
      }
      QueryOrderByChildConstraint2.prototype._apply = function(query2) {
        validateNoPreviousOrderByCall(query2, "orderByChild");
        var parsedPath = new Path(this._path);
        if (pathIsEmpty(parsedPath)) {
          throw new Error("orderByChild: cannot pass in empty path. Use orderByValue() instead.");
        }
        var index2 = new PathIndex(parsedPath);
        var newParams = queryParamsOrderBy(query2._queryParams, index2);
        validateQueryEndpoints(newParams);
        return new QueryImpl(query2._repo, query2._path, newParams, true);
      };
      return QueryOrderByChildConstraint2;
    }(QueryConstraint);
    function orderByChild(path) {
      if (path === "$key") {
        throw new Error('orderByChild: "$key" is invalid.  Use orderByKey() instead.');
      } else if (path === "$priority") {
        throw new Error('orderByChild: "$priority" is invalid.  Use orderByPriority() instead.');
      } else if (path === "$value") {
        throw new Error('orderByChild: "$value" is invalid.  Use orderByValue() instead.');
      }
      validatePathString("orderByChild", "path", path, false);
      return new QueryOrderByChildConstraint(path);
    }
    var QueryOrderByKeyConstraint = function(_super) {
      tslib.__extends(QueryOrderByKeyConstraint2, _super);
      function QueryOrderByKeyConstraint2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      QueryOrderByKeyConstraint2.prototype._apply = function(query2) {
        validateNoPreviousOrderByCall(query2, "orderByKey");
        var newParams = queryParamsOrderBy(query2._queryParams, KEY_INDEX);
        validateQueryEndpoints(newParams);
        return new QueryImpl(query2._repo, query2._path, newParams, true);
      };
      return QueryOrderByKeyConstraint2;
    }(QueryConstraint);
    function orderByKey() {
      return new QueryOrderByKeyConstraint();
    }
    var QueryOrderByPriorityConstraint = function(_super) {
      tslib.__extends(QueryOrderByPriorityConstraint2, _super);
      function QueryOrderByPriorityConstraint2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      QueryOrderByPriorityConstraint2.prototype._apply = function(query2) {
        validateNoPreviousOrderByCall(query2, "orderByPriority");
        var newParams = queryParamsOrderBy(query2._queryParams, PRIORITY_INDEX);
        validateQueryEndpoints(newParams);
        return new QueryImpl(query2._repo, query2._path, newParams, true);
      };
      return QueryOrderByPriorityConstraint2;
    }(QueryConstraint);
    function orderByPriority() {
      return new QueryOrderByPriorityConstraint();
    }
    var QueryOrderByValueConstraint = function(_super) {
      tslib.__extends(QueryOrderByValueConstraint2, _super);
      function QueryOrderByValueConstraint2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      QueryOrderByValueConstraint2.prototype._apply = function(query2) {
        validateNoPreviousOrderByCall(query2, "orderByValue");
        var newParams = queryParamsOrderBy(query2._queryParams, VALUE_INDEX);
        validateQueryEndpoints(newParams);
        return new QueryImpl(query2._repo, query2._path, newParams, true);
      };
      return QueryOrderByValueConstraint2;
    }(QueryConstraint);
    function orderByValue() {
      return new QueryOrderByValueConstraint();
    }
    var QueryEqualToValueConstraint = function(_super) {
      tslib.__extends(QueryEqualToValueConstraint2, _super);
      function QueryEqualToValueConstraint2(_value, _key) {
        var _this = _super.call(this) || this;
        _this._value = _value;
        _this._key = _key;
        return _this;
      }
      QueryEqualToValueConstraint2.prototype._apply = function(query2) {
        validateFirebaseDataArg("equalTo", this._value, query2._path, false);
        if (query2._queryParams.hasStart()) {
          throw new Error("equalTo: Starting point was already set (by another call to startAt/startAfter or equalTo).");
        }
        if (query2._queryParams.hasEnd()) {
          throw new Error("equalTo: Ending point was already set (by another call to endAt/endBefore or equalTo).");
        }
        return new QueryEndAtConstraint(this._value, this._key)._apply(new QueryStartAtConstraint(this._value, this._key)._apply(query2));
      };
      return QueryEqualToValueConstraint2;
    }(QueryConstraint);
    function equalTo(value, key) {
      validateKey("equalTo", "key", key, true);
      return new QueryEqualToValueConstraint(value, key);
    }
    function query(query2) {
      var e_1, _a;
      var queryConstraints = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        queryConstraints[_i - 1] = arguments[_i];
      }
      var queryImpl = util.getModularInstance(query2);
      try {
        for (var queryConstraints_1 = tslib.__values(queryConstraints), queryConstraints_1_1 = queryConstraints_1.next(); !queryConstraints_1_1.done; queryConstraints_1_1 = queryConstraints_1.next()) {
          var constraint = queryConstraints_1_1.value;
          queryImpl = constraint._apply(queryImpl);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (queryConstraints_1_1 && !queryConstraints_1_1.done && (_a = queryConstraints_1.return))
            _a.call(queryConstraints_1);
        } finally {
          if (e_1)
            throw e_1.error;
        }
      }
      return queryImpl;
    }
    syncPointSetReferenceConstructor(ReferenceImpl);
    syncTreeSetReferenceConstructor(ReferenceImpl);
    var FIREBASE_DATABASE_EMULATOR_HOST_VAR = "FIREBASE_DATABASE_EMULATOR_HOST";
    var repos = {};
    var useRestClient = false;
    function repoManagerApplyEmulatorSettings(repo, host, port, tokenProvider) {
      repo.repoInfo_ = new RepoInfo(host + ":" + port, false, repo.repoInfo_.namespace, repo.repoInfo_.webSocketOnly, repo.repoInfo_.nodeAdmin, repo.repoInfo_.persistenceKey, repo.repoInfo_.includeNamespaceInQueryParams);
      if (tokenProvider) {
        repo.authTokenProvider_ = tokenProvider;
      }
    }
    function repoManagerDatabaseFromApp(app, authProvider, appCheckProvider, url, nodeAdmin) {
      var dbUrl = url || app.options.databaseURL;
      if (dbUrl === void 0) {
        if (!app.options.projectId) {
          fatal("Can't determine Firebase Database URL. Be sure to include  a Project ID when calling firebase.initializeApp().");
        }
        log("Using default host for project ", app.options.projectId);
        dbUrl = app.options.projectId + "-default-rtdb.firebaseio.com";
      }
      var parsedUrl = parseRepoInfo(dbUrl, nodeAdmin);
      var repoInfo = parsedUrl.repoInfo;
      var isEmulator;
      var dbEmulatorHost = void 0;
      if (typeof process !== "undefined") {
        dbEmulatorHost = process.env[FIREBASE_DATABASE_EMULATOR_HOST_VAR];
      }
      if (dbEmulatorHost) {
        isEmulator = true;
        dbUrl = "http://" + dbEmulatorHost + "?ns=" + repoInfo.namespace;
        parsedUrl = parseRepoInfo(dbUrl, nodeAdmin);
        repoInfo = parsedUrl.repoInfo;
      } else {
        isEmulator = !parsedUrl.repoInfo.secure;
      }
      var authTokenProvider = nodeAdmin && isEmulator ? new EmulatorTokenProvider(EmulatorTokenProvider.OWNER) : new FirebaseAuthTokenProvider(app.name, app.options, authProvider);
      validateUrl("Invalid Firebase Database URL", parsedUrl);
      if (!pathIsEmpty(parsedUrl.path)) {
        fatal("Database URL must point to the root of a Firebase Database (not including a child path).");
      }
      var repo = repoManagerCreateRepo(repoInfo, app, authTokenProvider, new AppCheckTokenProvider(app.name, appCheckProvider));
      return new Database$1(repo, app);
    }
    function repoManagerDeleteRepo(repo, appName) {
      var appRepos = repos[appName];
      if (!appRepos || appRepos[repo.key] !== repo) {
        fatal("Database " + appName + "(" + repo.repoInfo_ + ") has already been deleted.");
      }
      repoInterrupt(repo);
      delete appRepos[repo.key];
    }
    function repoManagerCreateRepo(repoInfo, app, authTokenProvider, appCheckProvider) {
      var appRepos = repos[app.name];
      if (!appRepos) {
        appRepos = {};
        repos[app.name] = appRepos;
      }
      var repo = appRepos[repoInfo.toURLString()];
      if (repo) {
        fatal("Database initialized multiple times. Please make sure the format of the database URL matches with each database() call.");
      }
      repo = new Repo(repoInfo, useRestClient, authTokenProvider, appCheckProvider);
      appRepos[repoInfo.toURLString()] = repo;
      return repo;
    }
    function repoManagerForceRestClient(forceRestClient2) {
      useRestClient = forceRestClient2;
    }
    var Database$1 = function() {
      function Database2(_repoInternal, app) {
        this._repoInternal = _repoInternal;
        this.app = app;
        this["type"] = "database";
        this._instanceStarted = false;
      }
      Object.defineProperty(Database2.prototype, "_repo", {
        get: function() {
          if (!this._instanceStarted) {
            repoStart(this._repoInternal, this.app.options.appId, this.app.options["databaseAuthVariableOverride"]);
            this._instanceStarted = true;
          }
          return this._repoInternal;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Database2.prototype, "_root", {
        get: function() {
          if (!this._rootInternal) {
            this._rootInternal = new ReferenceImpl(this._repo, newEmptyPath());
          }
          return this._rootInternal;
        },
        enumerable: false,
        configurable: true
      });
      Database2.prototype._delete = function() {
        if (this._rootInternal !== null) {
          repoManagerDeleteRepo(this._repo, this.app.name);
          this._repoInternal = null;
          this._rootInternal = null;
        }
        return Promise.resolve();
      };
      Database2.prototype._checkNotDeleted = function(apiName) {
        if (this._rootInternal === null) {
          fatal("Cannot call " + apiName + " on a deleted database.");
        }
      };
      return Database2;
    }();
    function connectDatabaseEmulator(db, host, port, options2) {
      if (options2 === void 0) {
        options2 = {};
      }
      db = util.getModularInstance(db);
      db._checkNotDeleted("useEmulator");
      if (db._instanceStarted) {
        fatal("Cannot call useEmulator() after instance has already been initialized.");
      }
      var repo = db._repoInternal;
      var tokenProvider = void 0;
      if (repo.repoInfo_.nodeAdmin) {
        if (options2.mockUserToken) {
          fatal('mockUserToken is not supported by the Admin SDK. For client access with mock users, please use the "firebase" package instead of "firebase-admin".');
        }
        tokenProvider = new EmulatorTokenProvider(EmulatorTokenProvider.OWNER);
      } else if (options2.mockUserToken) {
        var token = util.createMockUserToken(options2.mockUserToken, db.app.options.projectId);
        tokenProvider = new EmulatorTokenProvider(token);
      }
      repoManagerApplyEmulatorSettings(repo, host, port, tokenProvider);
    }
    function goOffline(db) {
      db = util.getModularInstance(db);
      db._checkNotDeleted("goOffline");
      repoInterrupt(db._repo);
    }
    function goOnline(db) {
      db = util.getModularInstance(db);
      db._checkNotDeleted("goOnline");
      repoResume(db._repo);
    }
    function enableLogging(logger2, persistent) {
      enableLogging$1(logger2, persistent);
    }
    var SERVER_TIMESTAMP = {
      ".sv": "timestamp"
    };
    function serverTimestamp() {
      return SERVER_TIMESTAMP;
    }
    function increment(delta) {
      return {
        ".sv": {
          "increment": delta
        }
      };
    }
    var TransactionResult$1 = function() {
      function TransactionResult2(committed, snapshot) {
        this.committed = committed;
        this.snapshot = snapshot;
      }
      TransactionResult2.prototype.toJSON = function() {
        return { committed: this.committed, snapshot: this.snapshot.toJSON() };
      };
      return TransactionResult2;
    }();
    function runTransaction(ref2, transactionUpdate, options2) {
      var _a;
      ref2 = util.getModularInstance(ref2);
      validateWritablePath("Reference.transaction", ref2._path);
      if (ref2.key === ".length" || ref2.key === ".keys") {
        throw "Reference.transaction failed: " + ref2.key + " is a read-only object.";
      }
      var applyLocally = (_a = options2 === null || options2 === void 0 ? void 0 : options2.applyLocally) !== null && _a !== void 0 ? _a : true;
      var deferred = new util.Deferred();
      var promiseComplete = function(error4, committed, node) {
        var dataSnapshot = null;
        if (error4) {
          deferred.reject(error4);
        } else {
          dataSnapshot = new DataSnapshot$1(node, new ReferenceImpl(ref2._repo, ref2._path), PRIORITY_INDEX);
          deferred.resolve(new TransactionResult$1(committed, dataSnapshot));
        }
      };
      var unwatcher = onValue(ref2, function() {
      });
      repoStartTransaction(ref2._repo, ref2._path, transactionUpdate, promiseComplete, unwatcher, applyLocally);
      return deferred.promise;
    }
    var OnDisconnect = function() {
      function OnDisconnect2(_delegate) {
        this._delegate = _delegate;
      }
      OnDisconnect2.prototype.cancel = function(onComplete) {
        util.validateArgCount("OnDisconnect.cancel", 0, 1, arguments.length);
        util.validateCallback("OnDisconnect.cancel", "onComplete", onComplete, true);
        var result = this._delegate.cancel();
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      OnDisconnect2.prototype.remove = function(onComplete) {
        util.validateArgCount("OnDisconnect.remove", 0, 1, arguments.length);
        util.validateCallback("OnDisconnect.remove", "onComplete", onComplete, true);
        var result = this._delegate.remove();
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      OnDisconnect2.prototype.set = function(value, onComplete) {
        util.validateArgCount("OnDisconnect.set", 1, 2, arguments.length);
        util.validateCallback("OnDisconnect.set", "onComplete", onComplete, true);
        var result = this._delegate.set(value);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      OnDisconnect2.prototype.setWithPriority = function(value, priority, onComplete) {
        util.validateArgCount("OnDisconnect.setWithPriority", 2, 3, arguments.length);
        util.validateCallback("OnDisconnect.setWithPriority", "onComplete", onComplete, true);
        var result = this._delegate.setWithPriority(value, priority);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      OnDisconnect2.prototype.update = function(objectToMerge, onComplete) {
        util.validateArgCount("OnDisconnect.update", 1, 2, arguments.length);
        if (Array.isArray(objectToMerge)) {
          var newObjectToMerge = {};
          for (var i = 0; i < objectToMerge.length; ++i) {
            newObjectToMerge["" + i] = objectToMerge[i];
          }
          objectToMerge = newObjectToMerge;
          warn("Passing an Array to firebase.database.onDisconnect().update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.");
        }
        util.validateCallback("OnDisconnect.update", "onComplete", onComplete, true);
        var result = this._delegate.update(objectToMerge);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      return OnDisconnect2;
    }();
    var TransactionResult = function() {
      function TransactionResult2(committed, snapshot) {
        this.committed = committed;
        this.snapshot = snapshot;
      }
      TransactionResult2.prototype.toJSON = function() {
        util.validateArgCount("TransactionResult.toJSON", 0, 1, arguments.length);
        return { committed: this.committed, snapshot: this.snapshot.toJSON() };
      };
      return TransactionResult2;
    }();
    var DataSnapshot = function() {
      function DataSnapshot2(_database, _delegate) {
        this._database = _database;
        this._delegate = _delegate;
      }
      DataSnapshot2.prototype.val = function() {
        util.validateArgCount("DataSnapshot.val", 0, 0, arguments.length);
        return this._delegate.val();
      };
      DataSnapshot2.prototype.exportVal = function() {
        util.validateArgCount("DataSnapshot.exportVal", 0, 0, arguments.length);
        return this._delegate.exportVal();
      };
      DataSnapshot2.prototype.toJSON = function() {
        util.validateArgCount("DataSnapshot.toJSON", 0, 1, arguments.length);
        return this._delegate.toJSON();
      };
      DataSnapshot2.prototype.exists = function() {
        util.validateArgCount("DataSnapshot.exists", 0, 0, arguments.length);
        return this._delegate.exists();
      };
      DataSnapshot2.prototype.child = function(path) {
        util.validateArgCount("DataSnapshot.child", 0, 1, arguments.length);
        path = String(path);
        validatePathString("DataSnapshot.child", "path", path, false);
        return new DataSnapshot2(this._database, this._delegate.child(path));
      };
      DataSnapshot2.prototype.hasChild = function(path) {
        util.validateArgCount("DataSnapshot.hasChild", 1, 1, arguments.length);
        validatePathString("DataSnapshot.hasChild", "path", path, false);
        return this._delegate.hasChild(path);
      };
      DataSnapshot2.prototype.getPriority = function() {
        util.validateArgCount("DataSnapshot.getPriority", 0, 0, arguments.length);
        return this._delegate.priority;
      };
      DataSnapshot2.prototype.forEach = function(action) {
        var _this = this;
        util.validateArgCount("DataSnapshot.forEach", 1, 1, arguments.length);
        util.validateCallback("DataSnapshot.forEach", "action", action, false);
        return this._delegate.forEach(function(expDataSnapshot) {
          return action(new DataSnapshot2(_this._database, expDataSnapshot));
        });
      };
      DataSnapshot2.prototype.hasChildren = function() {
        util.validateArgCount("DataSnapshot.hasChildren", 0, 0, arguments.length);
        return this._delegate.hasChildren();
      };
      Object.defineProperty(DataSnapshot2.prototype, "key", {
        get: function() {
          return this._delegate.key;
        },
        enumerable: false,
        configurable: true
      });
      DataSnapshot2.prototype.numChildren = function() {
        util.validateArgCount("DataSnapshot.numChildren", 0, 0, arguments.length);
        return this._delegate.size;
      };
      DataSnapshot2.prototype.getRef = function() {
        util.validateArgCount("DataSnapshot.ref", 0, 0, arguments.length);
        return new Reference(this._database, this._delegate.ref);
      };
      Object.defineProperty(DataSnapshot2.prototype, "ref", {
        get: function() {
          return this.getRef();
        },
        enumerable: false,
        configurable: true
      });
      return DataSnapshot2;
    }();
    var Query = function() {
      function Query2(database, _delegate) {
        this.database = database;
        this._delegate = _delegate;
      }
      Query2.prototype.on = function(eventType, callback, cancelCallbackOrContext, context) {
        var _this = this;
        var _a;
        util.validateArgCount("Query.on", 2, 4, arguments.length);
        util.validateCallback("Query.on", "callback", callback, false);
        var ret = Query2.getCancelAndContextArgs_("Query.on", cancelCallbackOrContext, context);
        var valueCallback = function(expSnapshot, previousChildName) {
          callback.call(ret.context, new DataSnapshot(_this.database, expSnapshot), previousChildName);
        };
        valueCallback.userCallback = callback;
        valueCallback.context = ret.context;
        var cancelCallback = (_a = ret.cancel) === null || _a === void 0 ? void 0 : _a.bind(ret.context);
        switch (eventType) {
          case "value":
            onValue(this._delegate, valueCallback, cancelCallback);
            return callback;
          case "child_added":
            onChildAdded(this._delegate, valueCallback, cancelCallback);
            return callback;
          case "child_removed":
            onChildRemoved(this._delegate, valueCallback, cancelCallback);
            return callback;
          case "child_changed":
            onChildChanged(this._delegate, valueCallback, cancelCallback);
            return callback;
          case "child_moved":
            onChildMoved(this._delegate, valueCallback, cancelCallback);
            return callback;
          default:
            throw new Error(util.errorPrefix("Query.on", "eventType") + 'must be a valid event type = "value", "child_added", "child_removed", "child_changed", or "child_moved".');
        }
      };
      Query2.prototype.off = function(eventType, callback, context) {
        util.validateArgCount("Query.off", 0, 3, arguments.length);
        validateEventType("Query.off", eventType, true);
        util.validateCallback("Query.off", "callback", callback, true);
        util.validateContextObject("Query.off", "context", context, true);
        if (callback) {
          var valueCallback = function() {
          };
          valueCallback.userCallback = callback;
          valueCallback.context = context;
          off(this._delegate, eventType, valueCallback);
        } else {
          off(this._delegate, eventType);
        }
      };
      Query2.prototype.get = function() {
        var _this = this;
        return get(this._delegate).then(function(expSnapshot) {
          return new DataSnapshot(_this.database, expSnapshot);
        });
      };
      Query2.prototype.once = function(eventType, callback, failureCallbackOrContext, context) {
        var _this = this;
        util.validateArgCount("Query.once", 1, 4, arguments.length);
        util.validateCallback("Query.once", "callback", callback, true);
        var ret = Query2.getCancelAndContextArgs_("Query.once", failureCallbackOrContext, context);
        var deferred = new util.Deferred();
        var valueCallback = function(expSnapshot, previousChildName) {
          var result = new DataSnapshot(_this.database, expSnapshot);
          if (callback) {
            callback.call(ret.context, result, previousChildName);
          }
          deferred.resolve(result);
        };
        valueCallback.userCallback = callback;
        valueCallback.context = ret.context;
        var cancelCallback = function(error4) {
          if (ret.cancel) {
            ret.cancel.call(ret.context, error4);
          }
          deferred.reject(error4);
        };
        switch (eventType) {
          case "value":
            onValue(this._delegate, valueCallback, cancelCallback, {
              onlyOnce: true
            });
            break;
          case "child_added":
            onChildAdded(this._delegate, valueCallback, cancelCallback, {
              onlyOnce: true
            });
            break;
          case "child_removed":
            onChildRemoved(this._delegate, valueCallback, cancelCallback, {
              onlyOnce: true
            });
            break;
          case "child_changed":
            onChildChanged(this._delegate, valueCallback, cancelCallback, {
              onlyOnce: true
            });
            break;
          case "child_moved":
            onChildMoved(this._delegate, valueCallback, cancelCallback, {
              onlyOnce: true
            });
            break;
          default:
            throw new Error(util.errorPrefix("Query.once", "eventType") + 'must be a valid event type = "value", "child_added", "child_removed", "child_changed", or "child_moved".');
        }
        return deferred.promise;
      };
      Query2.prototype.limitToFirst = function(limit) {
        util.validateArgCount("Query.limitToFirst", 1, 1, arguments.length);
        return new Query2(this.database, query(this._delegate, limitToFirst(limit)));
      };
      Query2.prototype.limitToLast = function(limit) {
        util.validateArgCount("Query.limitToLast", 1, 1, arguments.length);
        return new Query2(this.database, query(this._delegate, limitToLast(limit)));
      };
      Query2.prototype.orderByChild = function(path) {
        util.validateArgCount("Query.orderByChild", 1, 1, arguments.length);
        return new Query2(this.database, query(this._delegate, orderByChild(path)));
      };
      Query2.prototype.orderByKey = function() {
        util.validateArgCount("Query.orderByKey", 0, 0, arguments.length);
        return new Query2(this.database, query(this._delegate, orderByKey()));
      };
      Query2.prototype.orderByPriority = function() {
        util.validateArgCount("Query.orderByPriority", 0, 0, arguments.length);
        return new Query2(this.database, query(this._delegate, orderByPriority()));
      };
      Query2.prototype.orderByValue = function() {
        util.validateArgCount("Query.orderByValue", 0, 0, arguments.length);
        return new Query2(this.database, query(this._delegate, orderByValue()));
      };
      Query2.prototype.startAt = function(value, name2) {
        if (value === void 0) {
          value = null;
        }
        util.validateArgCount("Query.startAt", 0, 2, arguments.length);
        return new Query2(this.database, query(this._delegate, startAt(value, name2)));
      };
      Query2.prototype.startAfter = function(value, name2) {
        if (value === void 0) {
          value = null;
        }
        util.validateArgCount("Query.startAfter", 0, 2, arguments.length);
        return new Query2(this.database, query(this._delegate, startAfter(value, name2)));
      };
      Query2.prototype.endAt = function(value, name2) {
        if (value === void 0) {
          value = null;
        }
        util.validateArgCount("Query.endAt", 0, 2, arguments.length);
        return new Query2(this.database, query(this._delegate, endAt(value, name2)));
      };
      Query2.prototype.endBefore = function(value, name2) {
        if (value === void 0) {
          value = null;
        }
        util.validateArgCount("Query.endBefore", 0, 2, arguments.length);
        return new Query2(this.database, query(this._delegate, endBefore(value, name2)));
      };
      Query2.prototype.equalTo = function(value, name2) {
        util.validateArgCount("Query.equalTo", 1, 2, arguments.length);
        return new Query2(this.database, query(this._delegate, equalTo(value, name2)));
      };
      Query2.prototype.toString = function() {
        util.validateArgCount("Query.toString", 0, 0, arguments.length);
        return this._delegate.toString();
      };
      Query2.prototype.toJSON = function() {
        util.validateArgCount("Query.toJSON", 0, 1, arguments.length);
        return this._delegate.toJSON();
      };
      Query2.prototype.isEqual = function(other) {
        util.validateArgCount("Query.isEqual", 1, 1, arguments.length);
        if (!(other instanceof Query2)) {
          var error4 = "Query.isEqual failed: First argument must be an instance of firebase.database.Query.";
          throw new Error(error4);
        }
        return this._delegate.isEqual(other._delegate);
      };
      Query2.getCancelAndContextArgs_ = function(fnName, cancelOrContext, context) {
        var ret = { cancel: void 0, context: void 0 };
        if (cancelOrContext && context) {
          ret.cancel = cancelOrContext;
          util.validateCallback(fnName, "cancel", ret.cancel, true);
          ret.context = context;
          util.validateContextObject(fnName, "context", ret.context, true);
        } else if (cancelOrContext) {
          if (typeof cancelOrContext === "object" && cancelOrContext !== null) {
            ret.context = cancelOrContext;
          } else if (typeof cancelOrContext === "function") {
            ret.cancel = cancelOrContext;
          } else {
            throw new Error(util.errorPrefix(fnName, "cancelOrContext") + " must either be a cancel callback or a context object.");
          }
        }
        return ret;
      };
      Object.defineProperty(Query2.prototype, "ref", {
        get: function() {
          return new Reference(this.database, new ReferenceImpl(this._delegate._repo, this._delegate._path));
        },
        enumerable: false,
        configurable: true
      });
      return Query2;
    }();
    var Reference = function(_super) {
      tslib.__extends(Reference2, _super);
      function Reference2(database, _delegate) {
        var _this = _super.call(this, database, new QueryImpl(_delegate._repo, _delegate._path, new QueryParams(), false)) || this;
        _this.database = database;
        _this._delegate = _delegate;
        return _this;
      }
      Reference2.prototype.getKey = function() {
        util.validateArgCount("Reference.key", 0, 0, arguments.length);
        return this._delegate.key;
      };
      Reference2.prototype.child = function(pathString) {
        util.validateArgCount("Reference.child", 1, 1, arguments.length);
        if (typeof pathString === "number") {
          pathString = String(pathString);
        }
        return new Reference2(this.database, child(this._delegate, pathString));
      };
      Reference2.prototype.getParent = function() {
        util.validateArgCount("Reference.parent", 0, 0, arguments.length);
        var parent = this._delegate.parent;
        return parent ? new Reference2(this.database, parent) : null;
      };
      Reference2.prototype.getRoot = function() {
        util.validateArgCount("Reference.root", 0, 0, arguments.length);
        return new Reference2(this.database, this._delegate.root);
      };
      Reference2.prototype.set = function(newVal, onComplete) {
        util.validateArgCount("Reference.set", 1, 2, arguments.length);
        util.validateCallback("Reference.set", "onComplete", onComplete, true);
        var result = set(this._delegate, newVal);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      Reference2.prototype.update = function(values, onComplete) {
        util.validateArgCount("Reference.update", 1, 2, arguments.length);
        if (Array.isArray(values)) {
          var newObjectToMerge = {};
          for (var i = 0; i < values.length; ++i) {
            newObjectToMerge["" + i] = values[i];
          }
          values = newObjectToMerge;
          warn("Passing an Array to Firebase.update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.");
        }
        validateWritablePath("Reference.update", this._delegate._path);
        util.validateCallback("Reference.update", "onComplete", onComplete, true);
        var result = update(this._delegate, values);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      Reference2.prototype.setWithPriority = function(newVal, newPriority, onComplete) {
        util.validateArgCount("Reference.setWithPriority", 2, 3, arguments.length);
        util.validateCallback("Reference.setWithPriority", "onComplete", onComplete, true);
        var result = setWithPriority(this._delegate, newVal, newPriority);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      Reference2.prototype.remove = function(onComplete) {
        util.validateArgCount("Reference.remove", 0, 1, arguments.length);
        util.validateCallback("Reference.remove", "onComplete", onComplete, true);
        var result = remove(this._delegate);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      Reference2.prototype.transaction = function(transactionUpdate, onComplete, applyLocally) {
        var _this = this;
        util.validateArgCount("Reference.transaction", 1, 3, arguments.length);
        util.validateCallback("Reference.transaction", "transactionUpdate", transactionUpdate, false);
        util.validateCallback("Reference.transaction", "onComplete", onComplete, true);
        validateBoolean("Reference.transaction", "applyLocally", applyLocally, true);
        var result = runTransaction(this._delegate, transactionUpdate, {
          applyLocally
        }).then(function(transactionResult) {
          return new TransactionResult(transactionResult.committed, new DataSnapshot(_this.database, transactionResult.snapshot));
        });
        if (onComplete) {
          result.then(function(transactionResult) {
            return onComplete(null, transactionResult.committed, transactionResult.snapshot);
          }, function(error4) {
            return onComplete(error4, false, null);
          });
        }
        return result;
      };
      Reference2.prototype.setPriority = function(priority, onComplete) {
        util.validateArgCount("Reference.setPriority", 1, 2, arguments.length);
        util.validateCallback("Reference.setPriority", "onComplete", onComplete, true);
        var result = setPriority(this._delegate, priority);
        if (onComplete) {
          result.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        return result;
      };
      Reference2.prototype.push = function(value, onComplete) {
        var _this = this;
        util.validateArgCount("Reference.push", 0, 2, arguments.length);
        util.validateCallback("Reference.push", "onComplete", onComplete, true);
        var expPromise = push(this._delegate, value);
        var promise = expPromise.then(function(expRef) {
          return new Reference2(_this.database, expRef);
        });
        if (onComplete) {
          promise.then(function() {
            return onComplete(null);
          }, function(error4) {
            return onComplete(error4);
          });
        }
        var result = new Reference2(this.database, expPromise);
        result.then = promise.then.bind(promise);
        result.catch = promise.catch.bind(promise, void 0);
        return result;
      };
      Reference2.prototype.onDisconnect = function() {
        validateWritablePath("Reference.onDisconnect", this._delegate._path);
        return new OnDisconnect(new OnDisconnect$1(this._delegate._repo, this._delegate._path));
      };
      Object.defineProperty(Reference2.prototype, "key", {
        get: function() {
          return this.getKey();
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Reference2.prototype, "parent", {
        get: function() {
          return this.getParent();
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Reference2.prototype, "root", {
        get: function() {
          return this.getRoot();
        },
        enumerable: false,
        configurable: true
      });
      return Reference2;
    }(Query);
    var Database = function() {
      function Database2(_delegate, app) {
        var _this = this;
        this._delegate = _delegate;
        this.app = app;
        this.INTERNAL = {
          delete: function() {
            return _this._delegate._delete();
          }
        };
      }
      Database2.prototype.useEmulator = function(host, port, options2) {
        if (options2 === void 0) {
          options2 = {};
        }
        connectDatabaseEmulator(this._delegate, host, port, options2);
      };
      Database2.prototype.ref = function(path) {
        util.validateArgCount("database.ref", 0, 1, arguments.length);
        if (path instanceof Reference) {
          var childRef = refFromURL(this._delegate, path.toString());
          return new Reference(this, childRef);
        } else {
          var childRef = ref(this._delegate, path);
          return new Reference(this, childRef);
        }
      };
      Database2.prototype.refFromURL = function(url) {
        var apiName = "database.refFromURL";
        util.validateArgCount(apiName, 1, 1, arguments.length);
        var childRef = refFromURL(this._delegate, url);
        return new Reference(this, childRef);
      };
      Database2.prototype.goOffline = function() {
        util.validateArgCount("database.goOffline", 0, 0, arguments.length);
        return goOffline(this._delegate);
      };
      Database2.prototype.goOnline = function() {
        util.validateArgCount("database.goOnline", 0, 0, arguments.length);
        return goOnline(this._delegate);
      };
      Database2.ServerValue = {
        TIMESTAMP: serverTimestamp(),
        increment: function(delta) {
          return increment(delta);
        }
      };
      return Database2;
    }();
    var forceLongPolling = function() {
      WebSocketConnection.forceDisallow();
      BrowserPollConnection.forceAllow();
    };
    var forceWebSockets = function() {
      BrowserPollConnection.forceDisallow();
    };
    var isWebSocketsAvailable = function() {
      return WebSocketConnection["isAvailable"]();
    };
    var setSecurityDebugCallback = function(ref2, callback) {
      var connection = ref2._delegate._repo.persistentConnection_;
      connection.securityDebugCallback_ = callback;
    };
    var stats = function(ref2, showDelta) {
      repoStats(ref2._delegate._repo, showDelta);
    };
    var statsIncrementCounter = function(ref2, metric) {
      repoStatsIncrementCounter(ref2._delegate._repo, metric);
    };
    var dataUpdateCount = function(ref2) {
      return ref2._delegate._repo.dataUpdateCount;
    };
    var interceptServerData = function(ref2, callback) {
      return repoInterceptServerData(ref2._delegate._repo, callback);
    };
    function initStandalone$1(_a) {
      var app = _a.app, url = _a.url, version2 = _a.version, customAuthImpl = _a.customAuthImpl, namespace = _a.namespace, _b = _a.nodeAdmin, nodeAdmin = _b === void 0 ? false : _b;
      setSDKVersion(version2);
      var authProvider = new component.Provider("auth-internal", new component.ComponentContainer("database-standalone"));
      authProvider.setComponent(new component.Component("auth-internal", function() {
        return customAuthImpl;
      }, "PRIVATE"));
      return {
        instance: new Database(repoManagerDatabaseFromApp(app, authProvider, void 0, url, nodeAdmin), app),
        namespace
      };
    }
    var INTERNAL = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      forceLongPolling,
      forceWebSockets,
      isWebSocketsAvailable,
      setSecurityDebugCallback,
      stats,
      statsIncrementCounter,
      dataUpdateCount,
      interceptServerData,
      initStandalone: initStandalone$1
    });
    var DataConnection = PersistentConnection;
    PersistentConnection.prototype.simpleListen = function(pathString, onComplete) {
      this.sendRequest("q", { p: pathString }, onComplete);
    };
    PersistentConnection.prototype.echo = function(data, onEcho) {
      this.sendRequest("echo", { d: data }, onEcho);
    };
    var RealTimeConnection = Connection;
    var hijackHash = function(newHash) {
      var oldPut = PersistentConnection.prototype.put;
      PersistentConnection.prototype.put = function(pathString, data, onComplete, hash2) {
        if (hash2 !== void 0) {
          hash2 = newHash();
        }
        oldPut.call(this, pathString, data, onComplete, hash2);
      };
      return function() {
        PersistentConnection.prototype.put = oldPut;
      };
    };
    var ConnectionTarget = RepoInfo;
    var queryIdentifier = function(query2) {
      return query2._delegate._queryIdentifier;
    };
    var forceRestClient = function(forceRestClient2) {
      repoManagerForceRestClient(forceRestClient2);
    };
    var TEST_ACCESS = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      DataConnection,
      RealTimeConnection,
      hijackHash,
      ConnectionTarget,
      queryIdentifier,
      forceRestClient
    });
    setWebSocketImpl(fayeWebsocket.Client);
    var ServerValue = Database.ServerValue;
    function initStandalone(app, url, version2, nodeAdmin) {
      if (nodeAdmin === void 0) {
        nodeAdmin = true;
      }
      util.CONSTANTS.NODE_ADMIN = nodeAdmin;
      return initStandalone$1({
        app,
        url,
        version: version2,
        customAuthImpl: app.INTERNAL,
        namespace: {
          Reference,
          Query,
          Database,
          DataSnapshot,
          enableLogging,
          INTERNAL,
          ServerValue,
          TEST_ACCESS
        },
        nodeAdmin
      });
    }
    function registerDatabase(instance) {
      setSDKVersion(instance.SDK_VERSION);
      var namespace = instance.INTERNAL.registerComponent(new component.Component("database", function(container, _a) {
        var url = _a.instanceIdentifier;
        var app = container.getProvider("app").getImmediate();
        var authProvider = container.getProvider("auth-internal");
        var appCheckProvider = container.getProvider("app-check-internal");
        return new Database(repoManagerDatabaseFromApp(app, authProvider, appCheckProvider, url), app);
      }, "PUBLIC").setServiceProps({
        Reference,
        Query,
        Database,
        DataSnapshot,
        enableLogging,
        INTERNAL,
        ServerValue,
        TEST_ACCESS
      }).setMultipleInstances(true));
      instance.registerVersion(name, version, "node");
      if (util.isNodeSdk()) {
        module2.exports = Object.assign({}, namespace, { initStandalone });
      }
    }
    try {
      firebase2 = require_index_node_cjs2().default;
      if (firebase2) {
        registerDatabase(firebase2);
      }
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") {
        throw err;
      }
    }
    var firebase2;
    exports.DataSnapshot = DataSnapshot;
    exports.Database = Database;
    exports.OnDisconnect = OnDisconnect;
    exports.Query = Query;
    exports.Reference = Reference;
    exports.ServerValue = ServerValue;
    exports.enableLogging = enableLogging;
    exports.initStandalone = initStandalone;
    exports.registerDatabase = registerDatabase;
  }
});

// .svelte-kit/vercel/entry.js
__export(exports, {
  default: () => entry_default
});
init_shims();

// node_modules/@sveltejs/kit/dist/node.js
init_shims();

// node_modules/@sveltejs/kit/dist/adapter-utils.js
init_shims();
function isContentTypeTextual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}

// node_modules/@sveltejs/kit/dist/node.js
function getRawBody(req) {
  return new Promise((fulfil, reject) => {
    const h = req.headers;
    if (!h["content-type"]) {
      return fulfil("");
    }
    req.on("error", reject);
    const length = Number(h["content-length"]);
    if (isNaN(length) && h["transfer-encoding"] == null) {
      return fulfil("");
    }
    let data = new Uint8Array(length || 0);
    if (length > 0) {
      let offset = 0;
      req.on("data", (chunk) => {
        const new_len = offset + Buffer.byteLength(chunk);
        if (new_len > length) {
          return reject({
            status: 413,
            reason: 'Exceeded "Content-Length" limit'
          });
        }
        data.set(chunk, offset);
        offset = new_len;
      });
    } else {
      req.on("data", (chunk) => {
        const new_data = new Uint8Array(data.length + chunk.length);
        new_data.set(data, 0);
        new_data.set(chunk, data.length);
        data = new_data;
      });
    }
    req.on("end", () => {
      const [type] = (h["content-type"] || "").split(/;\s*/);
      if (isContentTypeTextual(type)) {
        const encoding = h["content-encoding"] || "utf-8";
        return fulfil(new TextDecoder(encoding).decode(data));
      }
      fulfil(data);
    });
  });
}

// .svelte-kit/output/server/app.js
init_shims();

// node_modules/@sveltejs/kit/dist/ssr.js
init_shims();
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
async function render_endpoint(request, route) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler) {
    return;
  }
  const match = route.pattern.exec(request.path);
  if (!match) {
    return error("could not parse parameters from request path");
  }
  const params = route.params(match);
  const response = await handler({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = headers["content-type"];
  const is_type_textual = isContentTypeTextual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
Promise.resolve();
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = [];
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (let i = 0; i < subscribers.length; i += 1) {
          const s2 = subscribers[i];
          s2[1]();
          subscriber_queue.push(s2, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      const index2 = subscribers.indexOf(subscriber);
      if (index2 !== -1) {
        subscribers.splice(index2, 1);
      }
      if (subscribers.length === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
var s$1 = JSON.stringify;
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error3,
  page
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error3) {
    error3.stack = options2.get_stack(error3);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error4) => {
      throw new Error(`Failed to serialize session data: ${error4.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error3)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page && page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page && page.path)},
						query: new URLSearchParams(${page ? s$1(page.query.toString()) : ""}),
						params: ${page && s$1(page.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url="${url}"`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n			")}
		`.replace(/^\t{2}/gm, "");
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(err);
    return null;
  }
}
function serialize_error(error3) {
  if (!error3)
    return null;
  let serialized = try_serialize(error3);
  if (!serialized) {
    const { name, message, stack } = error3;
    serialized = try_serialize({ ...error3, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error3 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error3 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error3}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error3 };
    }
    return { status, error: error3 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  return loaded;
}
var s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  context,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error3
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let loaded;
  const page_proxy = new Proxy(page, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module2.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const filename = resolved.replace(options2.paths.assets, "").slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? {
              "content-type": asset.type
            } : {}
          }) : await fetch(`http://${page.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = { ...opts.headers };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body,
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.serverFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 !== "etag" && key2 !== "set-cookie")
                    headers[key2] = value;
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":${escape(body)}}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      context: { ...context }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error3;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    context: loaded.context || context,
    fetched,
    uses_credentials
  };
}
var escaped = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape(str) {
  let result = '"';
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped) {
      result += escaped[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += `\\u${code.toString(16).toUpperCase()}`;
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
var absolute = /^([a-z]+:)?\/?\//;
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
function coalesce_to_error(err) {
  return err instanceof Error ? err : new Error(JSON.stringify(err));
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error3 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    context: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      context: loaded ? loaded.context : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error3
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error3,
      branch,
      page
    });
  } catch (err) {
    const error4 = coalesce_to_error(err);
    options2.handle_error(error4, request);
    return {
      status: 500,
      headers: {},
      body: error4.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error4 = coalesce_to_error(err);
    options2.handle_error(error4, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error4
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: ""
    };
  }
  let branch = [];
  let status = 200;
  let error3;
  ssr:
    if (page_config.ssr) {
      let context = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              context,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            if (loaded.loaded.redirect) {
              return {
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              };
            }
            if (loaded.loaded.error) {
              ({ status, error: error3 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error3 = e;
          }
          if (loaded && !error3) {
            branch.push(loaded);
          }
          if (error3) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    context: node_loaded.context,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error3
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error3
            });
          }
        }
        if (loaded && loaded.loaded.context) {
          context = {
            ...context,
            ...loaded.loaded.context
          };
        }
      }
    }
  try {
    return await render_response({
      ...opts,
      page_config,
      status,
      error: error3,
      branch: branch.filter(Boolean)
    });
  } catch (err) {
    const error4 = coalesce_to_error(err);
    options2.handle_error(error4, request);
    return await respond_with_error({
      ...opts,
      status: 500,
      error: error4
    });
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
async function render_page(request, route, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const match = route.pattern.exec(request.path);
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
var ReadOnlyFormData = class {
  #map;
  constructor(map) {
    this.#map = map;
  }
  get(key) {
    const value = this.#map.get(key);
    return value && value[0];
  }
  getAll(key) {
    return this.#map.get(key);
  }
  has(key) {
    return this.#map.has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of this.#map)
      yield key;
  }
  *values() {
    for (const [, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
};
function parse_body(raw, headers) {
  if (!raw || typeof raw !== "string")
    return raw;
  const [type, ...directives] = headers["content-type"].split(/;\s*/);
  switch (type) {
    case "text/plain":
      return raw;
    case "application/json":
      return JSON.parse(raw);
    case "application/x-www-form-urlencoded":
      return get_urlencoded(raw);
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(raw, boundary.slice("boundary=".length));
    }
    default:
      throw new Error(`Invalid Content-Type ${type}`);
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        for (const route of options2.manifest.routes) {
          if (!route.pattern.test(decodeURI(request2.path)))
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route) : await render_page(request2, route, options2, state);
          if (response) {
            if (response.status === 200) {
              if (!/(no-store|immutable)/.test(response.headers["cache-control"])) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: ""
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}

// .svelte-kit/output/server/app.js
var import_app = __toModule(require_index_node_cjs2());
var import_database = __toModule(require_index_node_cjs3());
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
Promise.resolve();
var escaped2 = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape2(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped2[match]);
}
var missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
var on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : context || []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape2(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
var css = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AAsDC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css);
  {
    stores.page.set(page);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${``}`;
});
var base = "";
var assets = "";
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
var template = ({ head, body }) => '<!DOCTYPE html>\r\n<html lang="en">\r\n	<head>\r\n		<meta charset="utf-8" />\r\n		<link rel="icon" href="/favicon.png" />\r\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\r\n		' + head + '\r\n	</head>\r\n	<body>\r\n		<div id="svelte">' + body + "</div>\r\n	</body>\r\n</html>\r\n";
var options = null;
var default_settings = { paths: { "base": "", "assets": "" } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-e6f52d2e.js",
      css: [assets + "/_app/assets/start-a8cd1609.css", assets + "/_app/assets/vendor-7558c256.css"],
      js: [assets + "/_app/start-e6f52d2e.js", assets + "/_app/chunks/vendor-7a4ea0c2.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error22) => String(error22),
    handle_error: (error22, request) => {
      hooks.handleError({ error: error22, request });
      error22.stack = options.get_stack(error22);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: null,
    template,
    trailing_slash: "never"
  };
}
var d = decodeURIComponent;
var empty = () => ({});
var manifest = {
  assets: [{ "file": "favicon.png", "size": 38171, "type": "image/png" }, { "file": "robots.txt", "size": 68, "type": "text/plain" }],
  layout: "src/routes/__layout.svelte",
  error: ".svelte-kit/build/components/error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/([^/]+?)\/?$/,
      params: (m) => ({ code: d(m[1]) }),
      a: ["src/routes/__layout.svelte", "src/routes/[code].svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    }
  ]
};
var get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  handleError: hooks.handleError || (({ error: error22 }) => console.error(error22.stack)),
  serverFetch: hooks.serverFetch || fetch
});
var module_lookup = {
  "src/routes/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout;
  }),
  ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(function() {
    return error2;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index;
  }),
  "src/routes/[code].svelte": () => Promise.resolve().then(function() {
    return _code_;
  })
};
var metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-bb147ec4.js", "css": ["assets/vendor-7558c256.css"], "js": ["pages/__layout.svelte-bb147ec4.js", "chunks/vendor-7a4ea0c2.js"], "styles": [] }, ".svelte-kit/build/components/error.svelte": { "entry": "error.svelte-cbb80e72.js", "css": ["assets/vendor-7558c256.css"], "js": ["error.svelte-cbb80e72.js", "chunks/vendor-7a4ea0c2.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-70012aa9.js", "css": ["assets/vendor-7558c256.css"], "js": ["pages/index.svelte-70012aa9.js", "chunks/vendor-7a4ea0c2.js"], "styles": [] }, "src/routes/[code].svelte": { "entry": "pages/[code].svelte-f6a1a995.js", "css": ["assets/vendor-7558c256.css"], "js": ["pages/[code].svelte-f6a1a995.js", "chunks/vendor-7a4ea0c2.js"], "styles": [] } };
async function load_component(file) {
  const { entry, css: css2, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css2.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender });
}
var _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `${$$result.title = `<title>Shrt URL</title>`, ""}`, ""}

${slots.default ? slots.default({}) : ``}`;
});
var __layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout
});
function load$1({ error: error22, status }) {
  return { props: { error: error22, status } };
}
var Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error22 } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error22 !== void 0)
    $$bindings.error(error22);
  return `<h1>${escape2(status)}</h1>

<pre>${escape2(error22.message)}</pre>



${error22.frame ? `<pre>${escape2(error22.frame)}</pre>` : ``}
${error22.stack ? `<pre>${escape2(error22.stack)}</pre>` : ``}`;
});
var error2 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Error$1,
  load: load$1
});
var arrow = "\u1405";
var Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let enteredUrl;
  const API_KEY = {}.API_KEY;
  const PROJECT_ID = {}.PROJECT_ID;
  const APP_ID = {}.APP_ID;
  const AUTH_DOMAIN = {}.AUTH_DOMAIN;
  const STORAGE = {}.STORAGE;
  const MESSAGE_ID = {}.MESSAGE_ID;
  var firebaseConfig = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    databaseURL: "https://shrturl-1b151-default-rtdb.firebaseio.com",
    projectId: PROJECT_ID,
    storageBucket: STORAGE,
    messagingSenderId: MESSAGE_ID,
    appId: APP_ID
  };
  if (!import_app.default.apps.length) {
    import_app.default.default.initializeApp(firebaseConfig);
  } else {
    import_app.default.app();
  }
  import_app.default.database();
  return `${$$result.head += `<link href="${"https://cdn.jsdelivr.net/npm/tailwindcss@2.1/dist/tailwind.min.css"}" rel="${"stylesheet"}" type="${"text/css"}" data-svelte="svelte-1oz5wys"><link href="${"https://cdn.jsdelivr.net/npm/daisyui@1.11.0/dist/full.css"}" rel="${"stylesheet"}" type="${"text/css"}" data-svelte="svelte-1oz5wys"><meta name="${"theme-color"}" content="${"#426ff5"}" data-svelte="svelte-1oz5wys"><meta property="${"og:title"}" content="${"Shrt URL"}" data-svelte="svelte-1oz5wys"><meta property="${"og:type"}" content="${"website"}" data-svelte="svelte-1oz5wys"><meta property="${"og:url"}" content="${"/"}" data-svelte="svelte-1oz5wys"><meta property="${"og:image"}" content="${"https://i.ibb.co/vd6DCD1/favicon.png"}" data-svelte="svelte-1oz5wys"><meta property="${"og:description"}" content="${"A Simple URL Shortner With Svelte"}" data-svelte="svelte-1oz5wys">${$$result.title = `<title>Shrt Url</title>`, ""}`, ""}



<div class="${"hero min-h-screen bg-base-200 "}"><div class="${"p-4 rounded-md shadow-lg"}"><div class="${"text-center hero-content"}"><div class="${"max-w-md"}"><h1 class="${"mb-5 text-5xl font-bold"}" id="${"headd"}">Enter URL
        </h1>
        <p class="${"mb-5"}">Start Entering The URL Down Make Sure To Enter Right Url </p>
        
        <div class="${"form-control"}"><div class="${"flex space-x-2"}"><input type="${"text"}" placeholder="${"Url To Be Shorten"}" class="${"w-full input input-primary input-bordered"}"${add_attribute("value", enteredUrl, 0)}>
            <button class="${"btn btn-primary"}">${escape2(arrow)}</button></div></div>
        ${``}</div></div></div>
    
    ${``}
    </div>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes
});
async function load({ page }) {
  const code = page.params.code;
  return { props: { code } };
}
var U5Bcodeu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { code } = $$props;
  code = code.toLowerCase();
  const API_KEY = {}.API_KEY;
  const PROJECT_ID = {}.PROJECT_ID;
  const APP_ID = {}.APP_ID;
  const AUTH_DOMAIN = {}.AUTH_DOMAIN;
  const STORAGE = {}.STORAGE;
  const MESSAGE_ID = {}.MESSAGE_ID;
  var firebaseConfig = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    databaseURL: "https://shrturl-1b151-default-rtdb.firebaseio.com",
    projectId: PROJECT_ID,
    storageBucket: STORAGE,
    messagingSenderId: MESSAGE_ID,
    appId: APP_ID
  };
  if (!import_app.default.apps.length) {
    import_app.default.default.initializeApp(firebaseConfig);
  } else {
    import_app.default.app();
  }
  function redirect_url() {
    import_app.default.database().ref("/urls/" + code).once("value").then((snapshot) => {
      if (snapshot.exists()) {
        if (!snapshot.val().startsWith("http")) {
          document.getElementById("tst").href = "//" + snapshot.val();
          document.getElementById("tst").click();
        } else {
          document.getElementById("tst").href = snapshot.val();
          document.getElementById("tst").click();
        }
      } else {
        document.getElementById("tst").href = "https://shrturl.tk";
        document.getElementById("tst").click();
      }
    });
  }
  redirect_url();
  if ($$props.code === void 0 && $$bindings.code && code !== void 0)
    $$bindings.code(code);
  return `${$$result.head += `<link href="${"https://cdn.jsdelivr.net/npm/tailwindcss@2.1/dist/tailwind.min.css"}" rel="${"stylesheet"}" type="${"text/css"}" data-svelte="svelte-1r3pzqi"><link href="${"https://cdn.jsdelivr.net/npm/daisyui@1.11.0/dist/full.css"}" rel="${"stylesheet"}" type="${"text/css"}" data-svelte="svelte-1r3pzqi"><meta name="${"theme-color"}" content="${"#426ff5"}" data-svelte="svelte-1r3pzqi"><meta property="${"og:title"}"${add_attribute("content", "Shrt URL - Redirecting..." + code, 0)} data-svelte="svelte-1r3pzqi"><meta property="${"og:type"}" content="${"website"}" data-svelte="svelte-1r3pzqi"><meta property="${"og:url"}" content="${"/"}" data-svelte="svelte-1r3pzqi"><meta property="${"og:image"}" content="${"https://i.ibb.co/vd6DCD1/favicon.png"}" data-svelte="svelte-1r3pzqi"><meta property="${"og:description"}" content="${"A Simple URL Shortner With Svelte"}" data-svelte="svelte-1r3pzqi">${$$result.title = `<title>Shrt URL - Redirecting...</title>`, ""}`, ""}
<div class="${"hero min-h-screen bg-base-200"}"><div class="${"text-center hero-content"}"><div class="${"max-w-md"}"><a href="${"/"}" id="${"tst"}"><h1 class="${"mb-5 text-5xl font-bold"}">Redirecting... Please Wait</h1></a>
      
      <p>If Any Error Please Contact On Github, @ArnavK-09
    </p></div></div></div>`;
});
var _code_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": U5Bcodeu5D,
  load
});

// .svelte-kit/vercel/entry.js
init();
var entry_default = async (req, res) => {
  const { pathname, searchParams } = new URL(req.url || "", "http://localhost");
  let body;
  try {
    body = await getRawBody(req);
  } catch (err) {
    res.statusCode = err.status || 400;
    return res.end(err.reason || "Invalid request body");
  }
  const rendered = await render({
    method: req.method,
    headers: req.headers,
    path: pathname,
    query: searchParams,
    rawBody: body
  });
  if (rendered) {
    const { status, headers, body: body2 } = rendered;
    return res.writeHead(status, headers).end(body2);
  }
  return res.writeHead(404).end();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
 *
 * This can be used with JS designed for browsers to improve reuse of code and
 * allow the use of existing libraries.
 *
 * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
 *
 * @author Dan DeFelippi <dan@driverdan.com>
 * @contributor David Ellis <d.f.ellis@ieee.org>
 * @license MIT
 */

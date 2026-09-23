export interface SseParser {
  push(chunk: string): void;
  end(): void;
}

export function createSseParser(onEvent: (event: string, data: string) => void): SseParser {
  let buffer = "";
  let eventName = "message";
  let dataLines: string[] = [];

  const flush = (): void => {
    if (dataLines.length === 0) {
      eventName = "message";
      return;
    }
    onEvent(eventName, dataLines.join("\n"));
    eventName = "message";
    dataLines = [];
  };

  const consume = (line: string): void => {
    if (line === "") {
      flush();
      return;
    }
    if (line.startsWith(":")) return;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      return;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) consume(line);
    },
    end() {
      if (buffer.length > 0) {
        consume(buffer);
        buffer = "";
      }
      flush();
    },
  };
}

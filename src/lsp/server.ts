import {
  AbstractMessageReader,
  AbstractMessageWriter,
  Message,
  MessageWriter,
  type DataCallback,
  type Disposable,
  type MessageReader,
} from "vscode-languageserver";

export interface ServerLspMessage {
  type: "server-lsp";
  message: string;
}

export type ServerMessage = ServerLspMessage;

export class CustomMessageReader
  extends AbstractMessageReader
  implements MessageReader
{
  private _listener!: DataCallback;

  writeMessage(message: Message) {
    this._listener(message);
  }

  listen(callback: DataCallback): Disposable {
    this._listener = callback;
    return {
      //TODO?
      dispose: () => "",
    };
  }
}

export class CustomMessageWriter
  extends AbstractMessageWriter
  implements MessageWriter
{
  private _onMessage: (message: Message) => void;
  constructor(onMessage: (message: Message) => void) {
    super();
    this._onMessage = onMessage;
  }

  async write(message: Message): Promise<void> {
    this._onMessage(message);
  }

  //TODO?
  end() {}
}

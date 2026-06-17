export interface MessengerAttachment {
  type: "image" | "video" | "audio" | "file";
  payload: {
    url: string;
  };
}

export interface MessengerEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message: {
    mid: string;
    text?: string;
    attachments?: MessengerAttachment[];
  };
}

export interface MessengerPayload {
  object: "page";
  entry: [
    {
      id: string;
      time: number;
      messaging: MessengerEvent[];
    },
  ];
  // Optional: keeping your legacy fields temporarily for backward compatibility
  legacy_context?: {
    saveText?: string;
  };
}

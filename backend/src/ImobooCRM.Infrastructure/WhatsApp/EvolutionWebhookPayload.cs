using System.Text.Json.Serialization;

namespace ImobooCRM.Infrastructure.WhatsApp;

/// <summary>
/// Formato bruto do webhook da Evolution. Fica na Infrastructure de proposito:
/// a Application so conhece InboundMessage.
/// </summary>
public sealed class EvolutionWebhookPayload
{
    [JsonPropertyName("event")]
    public string? Event { get; set; }

    [JsonPropertyName("instance")]
    public string? Instance { get; set; }

    [JsonPropertyName("data")]
    public EvolutionMessageData? Data { get; set; }
}

public sealed class EvolutionMessageData
{
    [JsonPropertyName("key")]
    public EvolutionMessageKey? Key { get; set; }

    [JsonPropertyName("pushName")]
    public string? PushName { get; set; }

    [JsonPropertyName("messageType")]
    public string? MessageType { get; set; }

    [JsonPropertyName("message")]
    public EvolutionMessageContent? Message { get; set; }

    [JsonPropertyName("messageTimestamp")]
    public long? MessageTimestamp { get; set; }
}

public sealed class EvolutionMessageKey
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("remoteJid")]
    public string? RemoteJid { get; set; }

    [JsonPropertyName("fromMe")]
    public bool FromMe { get; set; }
}

public sealed class EvolutionMessageContent
{
    [JsonPropertyName("conversation")]
    public string? Conversation { get; set; }

    [JsonPropertyName("extendedTextMessage")]
    public ExtendedText? ExtendedTextMessage { get; set; }

    [JsonPropertyName("imageMessage")]
    public MediaMessage? ImageMessage { get; set; }

    [JsonPropertyName("audioMessage")]
    public MediaMessage? AudioMessage { get; set; }

    [JsonPropertyName("documentMessage")]
    public MediaMessage? DocumentMessage { get; set; }

    public sealed class ExtendedText
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    public sealed class MediaMessage
    {
        [JsonPropertyName("url")]
        public string? Url { get; set; }

        [JsonPropertyName("mimetype")]
        public string? Mimetype { get; set; }

        [JsonPropertyName("caption")]
        public string? Caption { get; set; }
    }

    /// <summary>Texto util da mensagem, independente do subtipo.</summary>
    public string? ExtractText() =>
        Conversation
        ?? ExtendedTextMessage?.Text
        ?? ImageMessage?.Caption
        ?? DocumentMessage?.Caption;

    public (string? Url, string? Type) ExtractMedia()
    {
        if (ImageMessage is not null) return (ImageMessage.Url, ImageMessage.Mimetype ?? "image");
        if (AudioMessage is not null) return (AudioMessage.Url, AudioMessage.Mimetype ?? "audio");
        if (DocumentMessage is not null) return (DocumentMessage.Url, DocumentMessage.Mimetype ?? "document");
        return (null, null);
    }
}

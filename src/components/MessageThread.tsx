import { useState, useRef, useEffect, forwardRef } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, MailOpen, Mail, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isCoach: boolean;
  isRead?: boolean;
  imageUrl?: string | null;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string, imageUrl?: string | null) => void;
  onToggleRead?: (messageId: string, nextRead: boolean) => void;
  placeholder?: string;
}

export const MessageThread = forwardRef<HTMLDivElement, MessageThreadProps>(
  function MessageThread({ messages, currentUserId, onSendMessage, onToggleRead, placeholder = "Écrire un message..." }, ref) {
    const [newMessage, setNewMessage] = useState("");
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
      if (!newMessage.trim() && !pendingImage) return;
      onSendMessage(newMessage.trim(), pendingImage);
      setNewMessage("");
      setPendingImage(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Format non supporté", description: "Choisissez une image.", variant: "destructive" });
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: "Image trop lourde", description: "Max 8 Mo.", variant: "destructive" });
        return;
      }
      setUploading(true);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-photos").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("chat-photos").getPublicUrl(path);
        setPendingImage(data.publicUrl);
      } catch (err) {
        console.error(err);
        toast({ title: "Erreur d'envoi de l'image", variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };

    return (
      <div ref={ref} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-3 p-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun message pour le moment</p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isMine = msg.senderId === currentUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        isMine
                          ? "bg-primary text-primary-foreground"
                          : `bg-secondary text-foreground ${msg.isRead === false ? "ring-2 ring-primary/40" : ""}`
                      }`}
                    >
                      <p className="text-[10px] opacity-70 mb-0.5">
                        {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {msg.imageUrl && (
                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
                          <img
                            src={msg.imageUrl}
                            alt="Photo partagée"
                            className="rounded-xl max-w-full max-h-60 object-cover"
                            loading="lazy"
                          />
                        </a>
                      )}
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                    {!isMine && onToggleRead && (
                      <button
                        onClick={() => onToggleRead(msg.id, !(msg.isRead ?? true))}
                        title={msg.isRead === false ? "Marquer comme lu" : "Marquer comme non lu"}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors active:scale-90"
                      >
                        {msg.isRead === false
                          ? <Mail className="w-3.5 h-3.5" />
                          : <MailOpen className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-border p-3 flex-shrink-0 space-y-2">
          {pendingImage && (
            <div className="relative inline-block">
              <img src={pendingImage} alt="Aperçu" className="h-20 rounded-xl object-cover" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl h-10 w-10 flex-shrink-0"
              title="Envoyer une photo"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            </Button>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-secondary border-0 rounded-xl resize-none min-h-[40px] max-h-[100px] text-sm py-2"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !pendingImage) || uploading}
              size="icon"
              className="rounded-xl h-10 w-10 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

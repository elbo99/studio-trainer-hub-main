import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dumbbell, Play, ArrowLeft, Plus, Trash2, X, Users, Pencil,
  FileText, BookOpen, Link2, Video, Download, ExternalLink, Loader2, Sparkles,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { CategoryAccessDialog } from "@/components/studio/CategoryAccessDialog";
import { CategoryFormDialog } from "@/components/studio/CategoryFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getCategoryVideos, addYouTubeVideo, deleteVideo,
  extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail,
  getCategoryResources, createResource, deleteResource, uploadResourceFile, getResourceSignedUrl,
  type StudioCategory, type StudioVideo, type StudioResource, type ResourceType,
} from "@/services/studioService";
import { getCoachMembers } from "@/services/membersService";

const resourceTypeMeta: Record<ResourceType | "video", { label: string; icon: any; color: string }> = {
  video: { label: "Vidéo", icon: Video, color: "text-rose-500 bg-rose-500/10" },
  pdf: { label: "PDF", icon: FileText, color: "text-red-500 bg-red-500/10" },
  article: { label: "Article", icon: BookOpen, color: "text-amber-500 bg-amber-500/10" },
  link: { label: "Lien", icon: Link2, color: "text-sky-500 bg-sky-500/10" },
};

export default function StudioWork() {
  const { user, profile } = useAuth();
  const isCoach = profile?.role === "coach";

  const [categories, setCategories] = useState<StudioCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<StudioCategory | null>(null);

  const [videos, setVideos] = useState<StudioVideo[]>([]);
  const [resources, setResources] = useState<StudioResource[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<StudioVideo | null>(null);
  const [readingArticle, setReadingArticle] = useState<StudioResource | null>(null);

  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [accessCategory, setAccessCategory] = useState<StudioCategory | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<StudioCategory | null>(null);

  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [resourceType, setResourceType] = useState<"video" | ResourceType>("video");
  const [resForm, setResForm] = useState({ title: "", description: "", url: "", content: "" });
  const [resFile, setResFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  // Load categories
  useEffect(() => {
    if (user) {
      setLoadingCats(true);
      getCategories().then(setCategories).catch(console.error).finally(() => setLoadingCats(false));
    }
  }, [user]);

  // Coach members
  useEffect(() => {
    if (isCoach && user) {
      getCoachMembers(user.id).then(m => setMembers(m.map(x => ({ id: x.id, name: x.name }))));
    }
  }, [isCoach, user]);

  // Load category content
  useEffect(() => {
    if (selectedCategory) {
      setLoadingContent(true);
      Promise.all([
        getCategoryVideos(selectedCategory.id),
        getCategoryResources(selectedCategory.id),
      ])
        .then(([v, r]) => { setVideos(v); setResources(r); })
        .catch(console.error)
        .finally(() => setLoadingContent(false));
    }
  }, [selectedCategory]);

  const pdfs = resources.filter(r => r.type === "pdf");
  const articles = resources.filter(r => r.type === "article");
  const links = resources.filter(r => r.type === "link");
  const totalCount = videos.length + resources.length;

  const handleCreateCategory = async (name: string, icon: string, subtitle: string, description: string) => {
    if (!user) return;
    const cat = await createCategory(user.id, name, icon, subtitle, description);
    setCategories(c => [...c, cat]);
    toast.success("Méthode créée");
  };

  const handleEditCategory = async (name: string, icon: string, subtitle: string, description: string) => {
    if (!editCategory) return;
    await updateCategory(editCategory.id, name, icon, subtitle || null, description || null);
    setCategories(c => c.map(x => x.id === editCategory.id ? { ...x, name, icon, subtitle, description } : x));
    if (selectedCategory?.id === editCategory.id) {
      setSelectedCategory(s => s ? { ...s, name, icon, subtitle, description } : s);
    }
    toast.success("Méthode modifiée");
  };

  const handleDeleteCategory = async (cat: StudioCategory) => {
    if (!confirm(`Supprimer la méthode "${cat.name}" et tout son contenu ?`)) return;
    try {
      await deleteCategory(cat.id);
      setCategories(c => c.filter(x => x.id !== cat.id));
      if (selectedCategory?.id === cat.id) setSelectedCategory(null);
      toast.success("Méthode supprimée");
    } catch { toast.error("Erreur"); }
  };

  const resetResourceForm = () => {
    setResForm({ title: "", description: "", url: "", content: "" });
    setResFile(null);
    setResourceType("video");
  };

  const handleAddResource = async () => {
    if (!user || !selectedCategory || !resForm.title.trim()) {
      toast.error("Titre requis");
      return;
    }
    setAdding(true);
    try {
      if (resourceType === "video") {
        if (!resForm.url || !extractYouTubeId(resForm.url)) {
          toast.error("Lien YouTube invalide");
          setAdding(false); return;
        }
        const v = await addYouTubeVideo(resForm.url, user.id, selectedCategory.id, resForm.title, resForm.description);
        setVideos(prev => [v, ...prev]);
      } else if (resourceType === "pdf") {
        if (!resFile) { toast.error("Sélectionnez un fichier PDF"); setAdding(false); return; }
        const { path, url } = await uploadResourceFile(user.id, resFile);
        const r = await createResource({
          coachId: user.id, categoryId: selectedCategory.id, type: "pdf",
          title: resForm.title, description: resForm.description, url, filePath: path,
        });
        setResources(prev => [r, ...prev]);
      } else if (resourceType === "article") {
        if (!resForm.content.trim()) { toast.error("Contenu de l'article requis"); setAdding(false); return; }
        const r = await createResource({
          coachId: user.id, categoryId: selectedCategory.id, type: "article",
          title: resForm.title, description: resForm.description, content: resForm.content,
        });
        setResources(prev => [r, ...prev]);
      } else if (resourceType === "link") {
        if (!resForm.url.trim()) { toast.error("URL requise"); setAdding(false); return; }
        const r = await createResource({
          coachId: user.id, categoryId: selectedCategory.id, type: "link",
          title: resForm.title, description: resForm.description, url: resForm.url,
        });
        setResources(prev => [r, ...prev]);
      }
      toast.success("Ressource ajoutée");
      setAddResourceOpen(false);
      resetResourceForm();
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteVideo = async (video: StudioVideo) => {
    try {
      await deleteVideo(video.id);
      setVideos(v => v.filter(x => x.id !== video.id));
      if (playingVideo?.id === video.id) setPlayingVideo(null);
      toast.success("Supprimé");
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteResource = async (r: StudioResource) => {
    try {
      await deleteResource(r.id, r.file_path);
      setResources(prev => prev.filter(x => x.id !== r.id));
      if (readingArticle?.id === r.id) setReadingArticle(null);
      toast.success("Supprimé");
    } catch { toast.error("Erreur"); }
  };

  const openResource = async (r: StudioResource) => {
    try {
      if (r.type === "pdf" && r.file_path) {
        const signed = await getResourceSignedUrl(r.file_path);
        window.open(signed, "_blank");
      } else if (r.url) {
        window.open(r.url, "_blank");
      }
    } catch {
      toast.error("Impossible d'ouvrir la ressource");
    }
  };

  // ── Categories list view ──────────────────────────────────────
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-12 pb-3">
          <h1 className="font-bold text-foreground text-xs">Studio Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Centre de ressources & méthodes</p>
        </motion.header>

        <main className="px-5 space-y-2.5 mt-2">
          {loadingCats ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {isCoach ? "Créez votre première méthode (perte de poids, Hyrox…)" : "Aucune méthode disponible"}
              </p>
            </div>
          ) : (
            categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="w-full bg-card rounded-2xl p-4 border border-border/40"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className="flex items-start gap-3 flex-1 text-left active:scale-[0.98] transition-transform min-w-0"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/25 flex items-center justify-center text-2xl shrink-0">
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-[15px] break-words">{cat.name}</h3>
                      {cat.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-2">{cat.subtitle}</p>
                      )}
                    </div>
                  </button>
                  {isCoach && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => setAccessCategory(cat)} className="p-1.5 text-muted-foreground hover:text-primary active:scale-90 transition-transform">
                        <Users className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditCategory(cat)} className="p-1.5 text-muted-foreground hover:text-primary active:scale-90 transition-transform">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 text-muted-foreground hover:text-destructive active:scale-90 transition-transform">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}

          {isCoach && (
            <Button onClick={() => setCreateOpen(true)} className="w-full rounded-2xl h-12 mt-2 gap-2 active:scale-[0.98] transition-transform">
              <Plus className="w-4 h-4" />
              Créer une méthode
            </Button>
          )}
        </main>

        <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreateCategory} title="Nouvelle méthode" />
        <CategoryFormDialog
          open={!!editCategory}
          onOpenChange={o => { if (!o) setEditCategory(null); }}
          onSubmit={handleEditCategory}
          initialName={editCategory?.name}
          initialIcon={editCategory?.icon}
          initialSubtitle={editCategory?.subtitle ?? ""}
          initialDescription={editCategory?.description ?? ""}
          title="Modifier la méthode"
          showPresets={false}
        />
        <CategoryAccessDialog category={accessCategory} members={members} open={!!accessCategory} onOpenChange={o => { if (!o) setAccessCategory(null); }} />
        <BottomNav />
      </div>
    );
  }

  // ── Category detail view ─────────────────────────────────────
  const embedUrl = playingVideo ? getYouTubeEmbedUrl(playingVideo.video_url) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-12 pb-3 bg-gradient-to-br from-primary/15 via-accent/15 to-background rounded-b-3xl">
        <button
          onClick={() => { setSelectedCategory(null); setPlayingVideo(null); setReadingArticle(null); }}
          className="flex items-center gap-1.5 text-muted-foreground mb-3 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </button>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center text-2xl shrink-0 shadow-sm">
            {selectedCategory.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground break-words">{selectedCategory.name}</h1>
            {selectedCategory.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 break-words">{selectedCategory.subtitle}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalCount} ressource{totalCount !== 1 ? "s" : ""} · {videos.length} vidéo{videos.length !== 1 ? "s" : ""} · {pdfs.length} PDF · {articles.length} article{articles.length !== 1 ? "s" : ""} · {links.length} lien{links.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {selectedCategory.description && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed whitespace-pre-wrap">
            {selectedCategory.description}
          </p>
        )}
      </motion.header>

      <main className="px-5 space-y-3 mt-4">
        {playingVideo && embedUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl overflow-hidden">
            <div className="relative">
              <iframe
                src={embedUrl}
                title={playingVideo.title}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button onClick={() => setPlayingVideo(null)} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 z-10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground text-sm">{playingVideo.title}</h3>
              {playingVideo.description && <p className="text-xs text-muted-foreground mt-0.5">{playingVideo.description}</p>}
            </div>
          </motion.div>
        )}

        {isCoach && (
          <Button onClick={() => { resetResourceForm(); setAddResourceOpen(true); }} className="w-full rounded-2xl h-10 gap-2">
            <Plus className="w-4 h-4" /> Ajouter une ressource
          </Button>
        )}

        {loadingContent ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              {isCoach ? "Ajoutez vidéos, PDF, articles ou liens" : "Bientôt du contenu ici"}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-9">
              <TabsTrigger value="all" className="text-[11px]">Tout</TabsTrigger>
              <TabsTrigger value="video" className="text-[11px]">Vidéos</TabsTrigger>
              <TabsTrigger value="pdf" className="text-[11px]">PDF</TabsTrigger>
              <TabsTrigger value="article" className="text-[11px]">Articles</TabsTrigger>
              <TabsTrigger value="link" className="text-[11px]">Liens</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-3">
              {videos.map((v, i) => <VideoCard key={v.id} v={v} i={i} isCoach={isCoach} onPlay={() => setPlayingVideo(v)} onDelete={() => handleDeleteVideo(v)} />)}
              {resources.map((r, i) => <ResourceCard key={r.id} r={r} i={i + videos.length} isCoach={isCoach} onOpen={() => r.type === "article" ? setReadingArticle(r) : openResource(r)} onDelete={() => handleDeleteResource(r)} />)}
            </TabsContent>
            <TabsContent value="video" className="space-y-2 mt-3">
              {videos.length === 0 ? <EmptyHint label="vidéo" /> : videos.map((v, i) => <VideoCard key={v.id} v={v} i={i} isCoach={isCoach} onPlay={() => setPlayingVideo(v)} onDelete={() => handleDeleteVideo(v)} />)}
            </TabsContent>
            <TabsContent value="pdf" className="space-y-2 mt-3">
              {pdfs.length === 0 ? <EmptyHint label="PDF" /> : pdfs.map((r, i) => <ResourceCard key={r.id} r={r} i={i} isCoach={isCoach} onOpen={() => openResource(r)} onDelete={() => handleDeleteResource(r)} />)}
            </TabsContent>
            <TabsContent value="article" className="space-y-2 mt-3">
              {articles.length === 0 ? <EmptyHint label="article" /> : articles.map((r, i) => <ResourceCard key={r.id} r={r} i={i} isCoach={isCoach} onOpen={() => setReadingArticle(r)} onDelete={() => handleDeleteResource(r)} />)}
            </TabsContent>
            <TabsContent value="link" className="space-y-2 mt-3">
              {links.length === 0 ? <EmptyHint label="lien" /> : links.map((r, i) => <ResourceCard key={r.id} r={r} i={i} isCoach={isCoach} onOpen={() => window.open(r.url ?? "", "_blank")} onDelete={() => handleDeleteResource(r)} />)}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Add resource dialog */}
      <Dialog open={addResourceOpen} onOpenChange={setAddResourceOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ajouter une ressource</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={resourceType} onValueChange={(v) => setResourceType(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">🎬 Vidéo YouTube</SelectItem>
                  <SelectItem value="pdf">📄 Document PDF</SelectItem>
                  <SelectItem value="article">📖 Article</SelectItem>
                  <SelectItem value="link">🔗 Lien externe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input placeholder="Titre" value={resForm.title} onChange={e => setResForm(f => ({ ...f, title: e.target.value }))} />

            {resourceType === "video" && (
              <Input placeholder="Lien YouTube" value={resForm.url} onChange={e => setResForm(f => ({ ...f, url: e.target.value }))} />
            )}
            {resourceType === "link" && (
              <Input placeholder="URL (https://…)" value={resForm.url} onChange={e => setResForm(f => ({ ...f, url: e.target.value }))} />
            )}
            {resourceType === "pdf" && (
              <div>
                <label className="text-xs text-muted-foreground">Fichier PDF</label>
                <Input type="file" accept="application/pdf" onChange={e => setResFile(e.target.files?.[0] ?? null)} className="mt-1" />
              </div>
            )}
            {resourceType === "article" && (
              <Textarea
                placeholder="Contenu de l'article…"
                value={resForm.content}
                onChange={e => setResForm(f => ({ ...f, content: e.target.value }))}
                rows={8}
                className="resize-none"
              />
            )}

            <Textarea
              placeholder="Description (optionnel)"
              value={resForm.description}
              onChange={e => setResForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="resize-none"
            />
            <Button onClick={handleAddResource} disabled={adding} className="w-full">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Article reader */}
      <Dialog open={!!readingArticle} onOpenChange={(o) => { if (!o) setReadingArticle(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{readingArticle?.title}</DialogTitle></DialogHeader>
          {readingArticle?.description && (
            <p className="text-xs text-muted-foreground -mt-2">{readingArticle.description}</p>
          )}
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {readingArticle?.content}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────
function EmptyHint({ label }: { label: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-xs text-muted-foreground">Aucun {label} pour le moment</p>
    </div>
  );
}

function VideoCard({ v, i, isCoach, onPlay, onDelete }: {
  v: StudioVideo; i: number; isCoach: boolean; onPlay: () => void; onDelete: () => void;
}) {
  const thumb = getYouTubeThumbnail(v.video_url);
  const meta = resourceTypeMeta.video;
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
      className="bg-card rounded-2xl p-3 flex items-center gap-3 border border-border/40"
    >
      <button onClick={onPlay} className="w-16 h-12 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 active:scale-90 transition-transform relative">
        {thumb ? <img src={thumb} alt={v.title} className="w-full h-full object-cover" /> : <Play className="w-5 h-5 text-primary" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${meta.color}`}>
            <meta.icon className="w-2.5 h-2.5" />{meta.label}
          </span>
        </div>
        <h4 className="font-medium text-foreground text-sm break-words">{v.title}</h4>
        {v.description && <p className="text-xs text-muted-foreground break-words line-clamp-2">{v.description}</p>}
      </div>
      {isCoach && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-2 active:scale-90 transition-transform">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

function ResourceCard({ r, i, isCoach, onOpen, onDelete }: {
  r: StudioResource; i: number; isCoach: boolean; onOpen: () => void; onDelete: () => void;
}) {
  const meta = resourceTypeMeta[r.type];
  const Icon = meta.icon;
  const ActionIcon = r.type === "pdf" ? Download : r.type === "link" ? ExternalLink : BookOpen;
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
      className="bg-card rounded-2xl p-3 flex items-center gap-3 border border-border/40"
    >
      <button onClick={onOpen} className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 active:scale-90 transition-transform ${meta.color}`}>
        <Icon className="w-5 h-5" />
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${meta.color}`}>
            <Icon className="w-2.5 h-2.5" />{meta.label}
          </span>
        </div>
        <h4 className="font-medium text-foreground text-sm break-words">{r.title}</h4>
        {r.description && <p className="text-xs text-muted-foreground break-words line-clamp-2">{r.description}</p>}
      </button>
      <button onClick={onOpen} className="text-muted-foreground hover:text-primary p-2 active:scale-90 transition-transform">
        <ActionIcon className="w-4 h-4" />
      </button>
      {isCoach && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-2 active:scale-90 transition-transform">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

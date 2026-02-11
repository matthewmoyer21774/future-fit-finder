import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, ExternalLink, Clock, Users, Search, MapPin, Calendar, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { programmes, categories } from "@/data/programmes";
import { Link } from "react-router-dom";

const Programmes = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = programmes.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.keyTopics.some((t) => t.toLowerCase().includes(q));
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sans text-foreground">Vlerick Advisor</h2>
              <p className="text-xs text-muted-foreground">Programme Catalogue</p>
            </div>
          </Link>
          <Link to="/">
            <Button variant="outline" size="sm">
              Get Recommendations
            </Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
            Programme Catalogue
          </h1>
          <p className="mb-8 text-muted-foreground">
            Explore all {programmes.length} Vlerick Business School programmes
          </p>
        </motion.div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search programmes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Programme Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((programme, i) => (
            <motion.div
              key={programme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.5) }}
            >
              <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {programme.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-sans leading-snug">
                    {programme.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">
                    {programme.description}
                  </p>
                  <div className="mb-4 space-y-1.5 text-sm">
                    {programme.duration && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{programme.duration}</span>
                      </div>
                    )}
                    {programme.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{programme.location}</span>
                      </div>
                    )}
                    {programme.fee && programme.fee !== "Contact for pricing" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{programme.fee}</span>
                      </div>
                    )}
                    {programme.startDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{programme.startDate}</span>
                      </div>
                    )}
                  </div>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {programme.keyTopics.map((topic) => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <a
                    href={programme.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      Learn More
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            No programmes match your search.
          </div>
        )}
      </section>
    </div>
  );
};

export default Programmes;

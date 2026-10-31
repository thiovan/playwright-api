import React from 'react';
import { Trash2, X, Sliders, Info, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { getActionIcon } from './CustomStepNode';

interface StepConfigDrawerProps {
  selectedNode: any;
  onUpdateNodeData: (id: string, newData: Record<string, any>) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
}

const COMMON_KEYS = ['Enter', 'Tab', 'Escape', 'Backspace', 'ArrowDown', 'ArrowUp', 'Space', 'Control+A', 'Control+C'];

export function StepConfigDrawer({
  selectedNode,
  onUpdateNodeData,
  onDeleteNode,
  onClose,
}: StepConfigDrawerProps) {
  if (!selectedNode) return null;

  const data = selectedNode.data || {};
  const action = data.action || 'goto';
  const Icon = getActionIcon(action);

  const handleChange = (field: string, val: any) => {
    onUpdateNodeData(selectedNode.id, {
      ...data,
      [field]: val,
    });
  };

  return (
    <div className="w-80 border-l border-border bg-card/90 backdrop-blur-md flex flex-col h-full overflow-y-auto p-5 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-primary/20 text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase">{action}</h4>
            <span className="text-[11px] text-muted-foreground font-mono">ID: {selectedNode.id}</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Form Fields */}
      <div className="py-4 space-y-4 flex-1">
        {/* URL input for goto */}
        {action === 'goto' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Target URL</label>
            <Input
              value={data.value || ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="https://example.com"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Bisa URL statis atau variabel: <code className="text-primary font-mono">&#123;&#123;targetUrl&#125;&#125;</code>, <code className="text-primary font-mono">https://example.com/user/&#123;&#123;userId&#125;&#125;</code>.
            </p>
          </div>
        )}

        {/* Standard Selector input */}
        {['click', 'dblclick', 'type', 'hover', 'select', 'check', 'uncheck', 'upload', 'wait-for'].includes(action) && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">CSS / XPath Selector</label>
            <Input
              value={data.selector || ''}
              onChange={(e) => handleChange('selector', e.target.value)}
              placeholder="button#submit, input[name='q']"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Mendukung selector CSS/XPath biasa atau variabel seperti <code className="text-primary font-mono">&#123;&#123;_selector&#125;&#125;</code> (saat di dalam loop elements) atau <code className="text-primary font-mono">&#123;&#123;btnSelector&#125;&#125;</code>.
            </p>
          </div>
        )}

        {/* Value input for type */}
        {action === 'type' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Input Text Value</label>
            <Input
              value={data.value !== undefined ? data.value : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="Text or {{var_name}}"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Bisa teks literal atau referensi variabel: <code className="text-primary font-mono">&#123;&#123;namaVar&#125;&#125;</code>, <code className="text-primary font-mono">&#123;&#123;_selector&#125;&#125;</code>, atau <code className="text-primary font-mono">&#123;&#123;_index&#125;&#125;</code>. Contoh: <em>Halo &#123;&#123;userName&#125;&#125;!</em>
            </p>
          </div>
        )}

        {/* Value input for select */}
        {action === 'select' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Option Value to Select</label>
            <Input
              value={data.value !== undefined ? data.value : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="option_value or {{selectedOption}}"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Nilai attribute <code className="font-mono">value</code> dari opsi dropdown. Bisa pakai <code className="text-primary font-mono">&#123;&#123;myOption&#125;&#125;</code>.
            </p>
          </div>
        )}

        {/* Value input for press key with quick pills & full hint */}
        {action === 'press' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Key Name / Shortcut</label>
            <Input
              value={data.value !== undefined ? data.value : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="Enter, Tab, Escape, Control+A"
              className="font-mono text-xs"
            />
            <div>
              <span className="text-[10px] text-muted-foreground font-semibold block mb-1">Quick Select:</span>
              <div className="flex flex-wrap gap-1">
                {COMMON_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleChange('value', k)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/60 hover:bg-primary/20 hover:text-primary border border-border transition-colors"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 rounded bg-muted/30 border border-border text-[10px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-sky-400" />
                <span>Nama Tombol yang Didukung:</span>
              </div>
              <p className="leading-relaxed">
                • <strong>Navigasi:</strong> <code className="font-mono">Enter</code>, <code className="font-mono">Tab</code>, <code className="font-mono">Escape</code>, <code className="font-mono">Backspace</code>, <code className="font-mono">Delete</code>, <code className="font-mono">Space</code><br />
                • <strong>Arah:</strong> <code className="font-mono">ArrowDown</code>, <code className="font-mono">ArrowUp</code>, <code className="font-mono">ArrowLeft</code>, <code className="font-mono">ArrowRight</code>, <code className="font-mono">PageDown</code>, <code className="font-mono">PageUp</code>, <code className="font-mono">Home</code>, <code className="font-mono">End</code><br />
                • <strong>Fungsi:</strong> <code className="font-mono">F1</code> s/d <code className="font-mono">F12</code><br />
                • <strong>Kombinasi:</strong> <code className="font-mono">Control+A</code>, <code className="font-mono">Control+C</code>, <code className="font-mono">Control+V</code>, <code className="font-mono">Shift+Tab</code>
              </p>
            </div>
          </div>
        )}

        {/* Value input for wait */}
        {action === 'wait' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Duration (Milliseconds)</label>
            <Input
              type="number"
              value={data.value !== undefined ? data.value : 1000}
              onChange={(e) => handleChange('value', parseInt(e.target.value, 10) || 0)}
              placeholder="1000"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Contoh: 1000 ms = 1 detik, 5000 ms = 5 detik.
            </p>
          </div>
        )}

        {/* Value input for upload */}
        {action === 'upload' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">File Path</label>
            <Input
              value={data.value || ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="/path/to/file.jpg or {{filePath}}"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Path absolut file yang akan diunggah ke input file.
            </p>
          </div>
        )}

        {/* Screenshot specific options */}
        {action === 'screenshot' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Element Selector (Optional)</label>
            <Input
              value={data.selector || ''}
              onChange={(e) => handleChange('selector', e.target.value)}
              placeholder="Leave empty for full page screenshot"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Kosongkan untuk screenshot layar penuh, atau isi selector elemen tertentu.
            </p>
          </div>
        )}

        {/* Eval JS Function */}
        {action === 'eval' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">JavaScript Function Body</label>
            <Textarea
              value={data.value || ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="return document.querySelector('h1').innerText;"
              className="mt-1 font-mono text-xs h-32"
            />
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Dijalankan di konteks browser. Jika selector diisi, elemen diteruskan sebagai <code className="font-mono">el</code>. Bisa pakai variabel <code className="text-primary font-mono">&#123;&#123;myVar&#125;&#125;</code>.
            </p>
          </div>
        )}

        {/* Get Element Text Action */}
        {action === 'get-text' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Element Selector</label>
              <Input
                value={data.selector || ''}
                onChange={(e) => handleChange('selector', e.target.value)}
                placeholder="h1, span.price, {{_selector}}"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Bisa pakai <code className="text-primary font-mono">&#123;&#123;_selector&#125;&#125;</code> saat di dalam loop elements.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Save to Variable Name</label>
              <Input
                value={data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. extractedText, pageTitle"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded border border-border bg-muted/20">
              <div>
                <span className="text-xs font-medium text-foreground block">Push to Array</span>
                <span className="text-[10px] text-muted-foreground">Simpan sebagai array jika di dalam loop</span>
              </div>
              <Switch
                checked={Boolean(data.push)}
                onCheckedChange={(val) => handleChange('push', val)}
              />
            </div>
          </div>
        )}

        {/* Get Element Attribute Action */}
        {action === 'get-attribute' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Element Selector</label>
              <Input
                value={data.selector || ''}
                onChange={(e) => handleChange('selector', e.target.value)}
                placeholder="a.product-link, img.banner, {{_selector}}"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Bisa gunakan <code className="text-primary font-mono">&#123;&#123;_selector&#125;&#125;</code> jika di dalam loop-elements.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Attribute Name to Extract</label>
              <Input
                value={data.value || ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="href, src, title, data-id, class"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Nama atribut HTML yang ingin diambil nilainya (contoh: <code className="font-mono">href</code> untuk link, <code className="font-mono">src</code> untuk gambar).
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Save to Variable Name</label>
              <Input
                value={data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. linkUrl, imageSrc"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded border border-border bg-muted/20">
              <div>
                <span className="text-xs font-medium text-foreground block">Push to Array</span>
                <span className="text-[10px] text-muted-foreground">Append ke array (misal saat loop)</span>
              </div>
              <Switch
                checked={Boolean(data.push)}
                onCheckedChange={(val) => handleChange('push', val)}
              />
            </div>
          </div>
        )}

        {/* Set Cookie Action */}
        {action === 'cookie-set' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Cookie Name</label>
              <Input
                value={data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="session_id, authToken"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Cookie Value</label>
              <Input
                value={data.value !== undefined ? data.value : ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="xyz123 or {{authToken}}"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Bisa teks statis atau interpolasi variabel: <code className="text-primary font-mono">&#123;&#123;myToken&#125;&#125;</code>.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Target URL / Domain (Optional)</label>
              <Input
                value={data.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://example.com"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Domain tempat cookie berlaku. Kosongkan untuk menggunakan URL halaman saat ini.
              </p>
            </div>
          </div>
        )}

        {/* Get Cookie Action */}
        {action === 'cookie-get' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Cookie Name</label>
            <Input
              value={data.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="session_id, token"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Membaca nilai cookie berdasarkan nama dan menyimpannya di variabel trace request.
            </p>
          </div>
        )}

        {/* Set Variable Action */}
        {action === 'var-set' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Variable Name</label>
              <Input
                value={data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. data, item, comments"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Value to Store (String or JSON Object)</label>
                <button
                  type="button"
                  onClick={() => {
                    handleChange('value', {
                      url: '{{url}}',
                      username: '{{username}}',
                      comment: '{{comment}}',
                      datetime: '{{datetime}}'
                    });
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Preset Object
                </button>
              </div>
              <Textarea
                value={
                  typeof data.value === 'object'
                    ? JSON.stringify(data.value, null, 2)
                    : data.value !== undefined
                    ? String(data.value)
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
                    try {
                      handleChange('value', JSON.parse(val));
                      return;
                    } catch {}
                  }
                  handleChange('value', val);
                }}
                placeholder='Literal string, or JSON object:&#10;{&#10;  "title": "{{scraped_title}}",&#10;  "url": "{{url}}"&#10;}'
                className="mt-1 font-mono text-xs h-28 text-emerald-300 bg-black/60"
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Mendukung teks biasa, angka, atau objek JSON bersarang. Semua properti dengan format <code className="text-primary font-mono">&#123;&#123;namaVar&#125;&#125;</code> akan otomatis diinterpolasi nilainya oleh engine.
              </p>
            </div>
            <div className="flex items-center justify-between p-2 rounded border border-border bg-muted/20">
              <div>
                <span className="text-xs font-medium text-foreground block">Push to Array</span>
                <span className="text-[10px] text-muted-foreground">Simpan sebagai array objek (misal saat loop scraper)</span>
              </div>
              <Switch
                checked={Boolean(data.push)}
                onCheckedChange={(val) => handleChange('push', val)}
              />
            </div>
          </div>
        )}

        {/* Get Variable Action */}
        {action === 'var-get' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Variable Name</label>
            <Input
              value={data.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. myVar"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Mengambil isi variabel yang telah disimpan sebelumnya.
            </p>
          </div>
        )}

        {/* Loop Elements */}
        {action === 'loop-elements' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Target Elements Selector</label>
              <Input
                value={data.selector || ''}
                onChange={(e) => handleChange('selector', e.target.value)}
                placeholder=".article-card, ul > li"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Selector kumpulan elemen DOM yang akan di-loop. Di dalam sub-step, gunakan <code className="text-primary font-mono">&#123;&#123;_selector&#125;&#125;</code> untuk merujuk elemen saat ini dan <code className="text-primary font-mono">&#123;&#123;_index&#125;&#125;</code> untuk nomor indeks perulangan.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Max Elements to Iterate</label>
              <Input
                type="number"
                value={data.max || 10}
                onChange={(e) => handleChange('max', parseInt(e.target.value, 10) || 1)}
                placeholder="10"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Sub-Actions (JSON)</label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = [
                      { action: 'get-text', selector: '{{_selector}} h2', name: 'titles', push: true }
                    ];
                    handleChange('workflow', sample);
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Preset Text
                </button>
              </div>
              <Textarea
                value={typeof data.workflow === 'string' ? data.workflow : JSON.stringify(data.workflow || [], null, 2)}
                onChange={(e) => {
                  try {
                    handleChange('workflow', JSON.parse(e.target.value));
                  } catch {
                    handleChange('workflow', e.target.value);
                  }
                }}
                placeholder="[ { &quot;action&quot;: &quot;click&quot;, &quot;selector&quot;: &quot;{{_selector}}&quot; } ]"
                className="mt-1 font-mono text-xs h-24 text-emerald-300 bg-black/60"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Atau tarik garis dari port <strong>BODY</strong> langsung di canvas!
              </p>
            </div>
          </div>
        )}

        {/* Loop Action */}
        {action === 'loop' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Loop Iterations (Count)</label>
              <Input
                type="number"
                value={data.count || 3}
                onChange={(e) => handleChange('count', parseInt(e.target.value, 10) || 1)}
                placeholder="3"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Jumlah pengulangan aksi.</p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Loop Actions (JSON)</label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = [{ action: 'wait', value: 1000 }];
                    handleChange('workflow', sample);
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Preset Wait
                </button>
              </div>
              <Textarea
                value={typeof data.workflow === 'string' ? data.workflow : JSON.stringify(data.workflow || [], null, 2)}
                onChange={(e) => {
                  try {
                    handleChange('workflow', JSON.parse(e.target.value));
                  } catch {
                    handleChange('workflow', e.target.value);
                  }
                }}
                placeholder="[ { &quot;action&quot;: &quot;wait&quot;, &quot;value&quot;: 1000 } ]"
                className="mt-1 font-mono text-xs h-24 text-emerald-300 bg-black/60"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Atau tarik garis dari port <strong>BODY</strong> langsung di canvas!
              </p>
            </div>
          </div>
        )}

        {/* If Condition Action */}
        {action === 'if' && (
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Condition Type</label>
              <select
                value={data.condition || 'selector-exists'}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full mt-1 h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="selector-exists">Element Exists (selector-exists)</option>
                <option value="var-equals">Variable Equals (var-equals)</option>
                <option value="eval">JavaScript Expression (eval)</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Kriteria evaluasi kondisi percabangan logika.
              </p>
            </div>

            {/* Selector for selector-exists */}
            {(data.condition === 'selector-exists' || !data.condition) && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Element Selector</label>
                <Input
                  value={data.selector || ''}
                  onChange={(e) => handleChange('selector', e.target.value)}
                  placeholder=".cookie-banner, #modal-popup, .btn-close"
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  True jika elemen terdeteksi di DOM (timeout 2s). Bisa pakai <code className="text-primary font-mono">&#123;&#123;myVar&#125;&#125;</code>.
                </p>
              </div>
            )}

            {/* Name & Expected Value for var-equals */}
            {data.condition === 'var-equals' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Variable Name</label>
                  <Input
                    value={data.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. status, pageTitle, isLoggedIn"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Expected Value</label>
                  <Input
                    value={data.value !== undefined ? data.value : ''}
                    onChange={(e) => handleChange('value', e.target.value)}
                    placeholder="e.g. success, 200, true"
                    className="mt-1 font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    True jika nilai variabel sama dengan nilai ini. Mendukung <code className="text-primary font-mono">&#123;&#123;expectedVar&#125;&#125;</code>.
                  </p>
                </div>
              </>
            )}

            {/* JavaScript Expression for eval */}
            {data.condition === 'eval' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">JavaScript Expression</label>
                <Textarea
                  value={data.value || ''}
                  onChange={(e) => handleChange('value', e.target.value)}
                  placeholder="return document.title.includes('Dashboard');"
                  className="mt-1 font-mono text-xs h-24"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  True jika script mengembalikan nilai true (truthy).
                </p>
              </div>
            )}

            {/* THEN branch */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Then Actions (JSON)</label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = [
                      { action: 'click', selector: data.selector || 'button.confirm' }
                    ];
                    handleChange('workflow', sample);
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Preset Click
                </button>
              </div>
              <Textarea
                value={typeof data.workflow === 'string' ? data.workflow : JSON.stringify(data.workflow || [], null, 2)}
                onChange={(e) => {
                  try {
                    handleChange('workflow', JSON.parse(e.target.value));
                  } catch {
                    handleChange('workflow', e.target.value);
                  }
                }}
                placeholder="[ { &quot;action&quot;: &quot;click&quot;, &quot;selector&quot;: &quot;#btn&quot; } ]"
                className="mt-1 font-mono text-xs h-24 text-emerald-300 bg-black/60"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Atau tarik garis dari port <strong>TRUE</strong> langsung di canvas!
              </p>
            </div>

            {/* ELSE branch */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Else Actions (Optional)</label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = [{ action: 'wait', value: 1000 }];
                    handleChange('else', sample);
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Preset Wait
                </button>
              </div>
              <Textarea
                value={typeof data.else === 'string' ? data.else : data.else ? JSON.stringify(data.else, null, 2) : ''}
                onChange={(e) => {
                  if (!e.target.value.trim()) {
                    handleChange('else', undefined);
                    return;
                  }
                  try {
                    handleChange('else', JSON.parse(e.target.value));
                  } catch {
                    handleChange('else', e.target.value);
                  }
                }}
                placeholder="[ { &quot;action&quot;: &quot;wait&quot;, &quot;value&quot;: 1000 } ]"
                className="mt-1 font-mono text-xs h-20 text-amber-300 bg-black/60"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Atau tarik garis dari port <strong>FALSE</strong> langsung di canvas!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border">
        <Button
          variant="destructive"
          size="sm"
          className="w-full text-xs"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Step
        </Button>
      </div>
    </div>
  );
}

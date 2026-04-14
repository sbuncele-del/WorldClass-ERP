/**
 * Notes Editor - View/edit financial statement notes
 */

import { useState, useEffect } from 'react';
import { notesApi } from '../services/reporting.api';

interface Note {
  id: string;
  note_number: number;
  title: string;
  narrative: string | null;
  is_applicable: boolean;
  source_links: string[];
}

interface Props {
  engagementId: string;
  isLocked: boolean;
}

export default function NotesEditor({ engagementId, isLocked }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNarrative, setEditNarrative] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [engagementId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const result = await notesApi.list(engagementId);
      if (result.success) {
        setNotes(result.data as Note[]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditNarrative(note.narrative || '');
  };

  const handleSave = async (noteId: string) => {
    try {
      await notesApi.update(engagementId, noteId, { narrative: editNarrative });
      setEditingId(null);
      await fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const toggleApplicable = async (note: Note) => {
    try {
      await notesApi.update(engagementId, note.id, { is_applicable: !note.is_applicable });
      await fetchNotes();
    } catch (error) {
      console.error('Error toggling note:', error);
    }
  };

  if (loading) {
    return <div className="reporting-loading"><div className="reporting-spinner" /><p>Loading notes...</p></div>;
  }

  return (
    <div className="notes-editor">
      <div className="notes-header">
        <h3>Notes to the Financial Statements</h3>
        <p>Auto-generated from linked accounts. Add narrative details for each note.</p>
      </div>

      <div className="notes-list">
        {notes.map(note => (
          <div key={note.id} className={`note-card ${note.is_applicable ? '' : 'not-applicable'}`}>
            <div className="note-header">
              <div className="note-title-row">
                <span className="note-number">{note.note_number}.</span>
                <span className="note-title">{note.title}</span>
              </div>
              {!isLocked && (
                <div className="note-actions">
                  <label className="note-toggle">
                    <input
                      type="checkbox"
                      checked={note.is_applicable}
                      onChange={() => toggleApplicable(note)}
                    />
                    Applicable
                  </label>
                </div>
              )}
            </div>

            {note.source_links.length > 0 && (
              <div className="note-links">
                Sources: {note.source_links.join(', ')}
              </div>
            )}

            {editingId === note.id ? (
              <div className="note-edit">
                <textarea
                  value={editNarrative}
                  onChange={e => setEditNarrative(e.target.value)}
                  rows={4}
                  placeholder="Add note narrative..."
                />
                <div className="note-edit-actions">
                  <button className="btn-primary btn-sm" onClick={() => handleSave(note.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="note-content" onClick={() => !isLocked && handleEdit(note)}>
                {note.narrative || <span className="note-placeholder">Click to add narrative...</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

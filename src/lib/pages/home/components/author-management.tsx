import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, XCircle, MoveDown, Check, ChevronsUpDown } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

// Replace the Command component with a simpler multi-select approach using Select
import { Badge } from '@/components/ui/badge';

interface AuthorManagementProps {
  allAuthors: string[];
  initialAuthorGroups: string[][];
  initialExcludeAuthors: string[];
  onGroupsChange: (groups: string[][]) => void;
  onExcludesChange: (excludes: string[]) => void;
}

const AuthorManagement: React.FC<AuthorManagementProps> = ({
  allAuthors,
  initialAuthorGroups,
  initialExcludeAuthors,
  onGroupsChange,
  onExcludesChange
}) => {
  const [authorGroups, setAuthorGroups] = useState<string[][]>(initialAuthorGroups);
  const [excludedAuthors, setExcludedAuthors] = useState<string[]>(initialExcludeAuthors);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Find available authors that aren't already in groups
  const getAvailableAuthors = (currentGroupIndex: number) => {
    // Get all authors that are currently in groups (except the current group we're editing)
    const usedAuthors = new Set<string>();
    
    authorGroups.forEach((group, index) => {
      if (index !== currentGroupIndex) {
        group.forEach(author => usedAuthors.add(author));
      }
    });
    
    // Return authors that are not yet used in other groups
    return allAuthors.filter(author => !usedAuthors.has(author));
  };
  
  // Add a new empty author group
  const addAuthorGroup = () => {
    const availableAuthors = getAvailableAuthors(-1);
    const newGroup = availableAuthors.length > 0 ? [availableAuthors[0]] : [];
    const updatedGroups = [...authorGroups, newGroup];
    setAuthorGroups(updatedGroups);
    onGroupsChange(updatedGroups);
  };
  
  // Remove an author group
  const removeAuthorGroup = (index: number) => {
    const updatedGroups = authorGroups.filter((_, i) => i !== index);
    setAuthorGroups(updatedGroups);
    onGroupsChange(updatedGroups);
  };
  
  // Add author to a group
  const addAuthorToGroup = (groupIndex: number, author: string) => {
    if (!author) return;
    
    const updatedGroups = [...authorGroups];
    if (!updatedGroups[groupIndex].includes(author)) {
      updatedGroups[groupIndex].push(author);
      setAuthorGroups(updatedGroups);
      onGroupsChange(updatedGroups);
    }
  };
  
  // Remove author from a group
  const removeAuthorFromGroup = (groupIndex: number, author: string) => {
    const updatedGroups = [...authorGroups];
    updatedGroups[groupIndex] = updatedGroups[groupIndex].filter(a => a !== author);
    
    // If group is now empty, remove the group
    if (updatedGroups[groupIndex].length === 0) {
      updatedGroups.splice(groupIndex, 1);
    }
    
    setAuthorGroups(updatedGroups);
    onGroupsChange(updatedGroups);
  };
  
  // Toggle an author in the excluded list
  const toggleExcludeAuthor = (author: string) => {
    let updatedExcludes;
    if (excludedAuthors.includes(author)) {
      updatedExcludes = excludedAuthors.filter(a => a !== author);
    } else {
      updatedExcludes = [...excludedAuthors, author];
    }
    setExcludedAuthors(updatedExcludes);
    onExcludesChange(updatedExcludes);
  };

  // Move an author to the first position in its group (making it the main author)
  const moveAuthorToFirstPosition = (groupIndex: number, authorIndex: number) => {
    if (authorIndex === 0) return; // Already at the first position
    
    const updatedGroups = [...authorGroups];
    const author = updatedGroups[groupIndex][authorIndex];
    updatedGroups[groupIndex].splice(authorIndex, 1);
    updatedGroups[groupIndex].unshift(author);
    
    setAuthorGroups(updatedGroups);
    onGroupsChange(updatedGroups);
  };

  // Handle excluding an author
  const handleExcludeAuthor = (author: string) => {
    toggleExcludeAuthor(author);
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Author Management</h3>
        <Button 
          variant="outline" 
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? 'Hide Settings' : 'Show Settings'}
        </Button>
      </div>

      {showSettings && (
        <>
          <div className="mb-6">
            <h4 className="text-md font-medium mb-2">Author Groups</h4>
            <p className="text-sm text-gray-500 mb-3">
              Group authors with multiple names. The first author in each group will be the main name.
            </p>
            
            {authorGroups.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`} className="border p-3 rounded-md mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Group {groupIndex + 1}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeAuthorGroup(groupIndex)}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Remove Group
                  </Button>
                </div>
                
                {/* Display current authors in group */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {group.map((author, authorIndex) => (
                    <div 
                      key={`${groupIndex}-${author}`}
                      className="bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1 text-sm"
                    >
                      {authorIndex === 0 && <span className="text-green-600 font-bold mr-1">Main:</span>}
                      <span>{author}</span>
                      {authorIndex !== 0 && (
                        <button 
                          onClick={() => moveAuthorToFirstPosition(groupIndex, authorIndex)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <MoveDown className="h-3 w-3" />
                        </button>
                      )}
                      <button 
                        onClick={() => removeAuthorFromGroup(groupIndex, author)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Add more authors to this group */}
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => addAuthorToGroup(groupIndex, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add author" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableAuthors(groupIndex)
                        .filter(author => !group.includes(author))
                        .map(author => (
                          <SelectItem key={author} value={author}>
                            {author}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const available = getAvailableAuthors(groupIndex)
                        .filter(author => !group.includes(author));
                      if (available.length > 0) {
                        addAuthorToGroup(groupIndex, available[0]);
                      }
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              onClick={addAuthorGroup}
              disabled={getAvailableAuthors(-1).length === 0}
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add New Group
            </Button>
          </div>

          <div>
            <h4 className="text-md font-medium mb-2">Exclude Authors</h4>
            <p className="text-sm text-gray-500 mb-3">
              Select authors to exclude from the visualization.
            </p>
            
            {/* Simplified multi-select interface */}
            <div className="space-y-4">
              <Select onValueChange={handleExcludeAuthor}>
                <SelectTrigger className="w-full">
                  <div className="flex justify-between">
                    <SelectValue placeholder="Select authors to exclude" />
                    <div className="flex items-center">
                      {excludedAuthors.length > 0 && (
                        <Badge variant="secondary" className="mr-2">
                          {excludedAuthors.length} selected
                        </Badge>
                      )}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {allAuthors?.map(author => (
                    <SelectItem key={author} value={author}>
                      <div className="flex items-center justify-between w-full">
                        {author}
                        {excludedAuthors.includes(author) && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {excludedAuthors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {excludedAuthors.map((author) => (
                    <Badge 
                      key={author} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {author}
                      <XCircle 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => toggleExcludeAuthor(author)} 
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default AuthorManagement;

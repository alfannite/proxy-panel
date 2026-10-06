import re

with open("src/app/page.tsx", "r") as f:
    content = f.read()

# Add import
content = content.replace('import { useRouter } from "next/navigation";', 'import { useRouter } from "next/navigation";\nimport { Modal } from "@/components/Modal";')

# Modal 1: Add New Proxy
content = content.replace('''      {/* Add New Proxy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="solid-panel relative w-full max-w-lg p-6 md:p-8 shadow-2xl animate-[slideIn_0.2s_ease-out]">''', '''      {/* Add New Proxy Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} zIndex={50}>
        <div className="solid-panel relative w-full w-[500px] max-w-[90vw] p-6 md:p-8 shadow-2xl">''')

# Close Modal 1
content = content.replace('''            </div>
          </div>
        </div>
      )}

      {/* Manage Service Modal */}''', '''            </div>
          </div>
      </Modal>

      {/* Manage Service Modal */}''')

# Modal 2: Manage Service
content = content.replace('''      {/* Manage Service Modal */}
      {manageProxy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 transition-opacity"
            onClick={() => setManageProxy(null)}
          />

          <div className="solid-panel relative w-full max-w-sm p-6 shadow-2xl animate-[slideIn_0.2s_ease-out]">''', '''      {/* Manage Service Modal */}
      <Modal isOpen={!!manageProxy} onClose={() => setManageProxy(null)} zIndex={60}>
        <div className="solid-panel relative w-full w-[380px] max-w-[90vw] p-6 shadow-2xl">''')

# Close Modal 2
content = content.replace('''          </div>
        </div>
      )}
      {/* Global Tooltip */}''', '''          </div>
      </Modal>
      {/* Global Tooltip */}''')

# Modal 3: Delete Confirmation
content = content.replace('''      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-base border border-border-base rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative p-6 animate-[slideIn_0.2s_ease-out]">''', '''      {/* Custom Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} zIndex={60}>
        <div className="bg-surface-base border border-border-base rounded-2xl w-full w-[380px] max-w-[90vw] overflow-hidden shadow-2xl relative p-6">''')

# Close Modal 3
content = content.replace('''          </div>
        </div>
      )}

      {/* UI Messages Modal */}''', '''          </div>
      </Modal>

      {/* UI Messages Modal */}''')

# Modal 4: UI Messages
content = content.replace('''      {/* UI Messages Modal */}
      {uiMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md bg-black/20 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-base border border-border-base rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative p-6 text-center animate-[slideIn_0.2s_ease-out]">''', '''      {/* UI Messages Modal */}
      <Modal isOpen={!!uiMessage} onClose={() => setUiMessage(null)} zIndex={70}>
        <div className="bg-surface-base border border-border-base rounded-2xl w-full w-[380px] max-w-[90vw] overflow-hidden shadow-2xl relative p-6 text-center">''')

# Close Modal 4
content = content.replace('''          </div>
        </div>
      )}
    </div>''', '''          </div>
      </Modal>
    </div>''')

with open("src/app/page.tsx", "w") as f:
    f.write(content)

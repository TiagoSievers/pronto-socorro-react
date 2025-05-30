import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Typography, Box } from '@mui/material';
import { buscarAdminUsers, updateAdminUser, deleteAdminUser } from './api';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import AddUserAdminDialog from './AddUserAdminDialog';
import { supabase } from '../Supabase/supabaseRealtimeClient';

interface UsuarioAdmin {
  id?: number;
  nome: string;
  email: string;
  perfil?: string;
  last_sign_in_at?: string | null;
}

const AdminUserList: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UsuarioAdmin | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUsuario, setEditUsuario] = useState<UsuarioAdmin | null>(null);

  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await buscarAdminUsers();
        data.sort((a: UsuarioAdmin, b: UsuarioAdmin) => {
          if ((a as any).data_cadastro && (b as any).data_cadastro) {
            return new Date((b as any).data_cadastro).getTime() - new Date((a as any).data_cadastro).getTime();
          }
          return (b.id || 0) - (a.id || 0);
        });
        setUsuarios(data as UsuarioAdmin[]);
      } catch (error) {
        console.error('Erro ao carregar usuários administrativos:', error);
        setError('Não foi possível carregar a lista de usuários administrativos. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    loadUsuarios();

    // Realtime subscription
    const channel = supabase
      .channel('public:administrador')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administrador' }, (payload) => {
        loadUsuarios();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenDeleteDialog = (usuario: UsuarioAdmin) => {
    setUserToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteAdminUser(Number(userToDelete.id));
      const updated = await buscarAdminUsers();
      updated.sort((a: UsuarioAdmin, b: UsuarioAdmin) => {
        if ((a as any).data_cadastro && (b as any).data_cadastro) {
          return new Date((b as any).data_cadastro).getTime() - new Date((a as any).data_cadastro).getTime();
        }
        return (b.id || 0) - (a.id || 0);
      });
      setUsuarios(updated as UsuarioAdmin[]);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      alert('Usuário administrativo excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir usuário administrativo.');
    }
  };

  const handleEdit = (usuario: UsuarioAdmin) => {
    setEditUsuario(usuario);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditUsuario(null);
  };

  const handleSaveEdit = async (data: { nome: string; email: string; perfil: string }) => {
    if (!editUsuario || !editUsuario.id) return;
    try {
      await updateAdminUser(editUsuario.id, {
        nome: data.nome,
        email: data.email,
        perfil: data.perfil,
      });
      const updated = await buscarAdminUsers();
      updated.sort((a: UsuarioAdmin, b: UsuarioAdmin) => {
        if ((a as any).data_cadastro && (b as any).data_cadastro) {
          return new Date((b as any).data_cadastro).getTime() - new Date((a as any).data_cadastro).getTime();
        }
        return (b.id || 0) - (a.id || 0);
      });
      setUsuarios(updated as UsuarioAdmin[]);
      setEditDialogOpen(false);
      setEditUsuario(null);
      alert('Usuário administrativo atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar usuário administrativo.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="tabela de usuários administrativos">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Perfil</TableCell>
            <TableCell>Último Login</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {usuarios.length > 0 ? (
            usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.id}</TableCell>
                <TableCell>{usuario.nome}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>{usuario.perfil || '-'}</TableCell>
                <TableCell>{usuario.last_sign_in_at ? new Date(usuario.last_sign_in_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</TableCell>
                <TableCell>
                  <Button size="small" color="primary" onClick={() => handleEdit(usuario)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => handleOpenDeleteDialog(usuario)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                Nenhum usuário administrativo encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        itemName={userToDelete?.nome}
      />
      <AddUserAdminDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        initialData={editUsuario ? {
          nome: editUsuario.nome || '',
          email: editUsuario.email || '',
          perfil: editUsuario.perfil || 'administrador',
        } : undefined}
        onSave={handleSaveEdit}
      />
    </TableContainer>
  );
};

export default AdminUserList; 
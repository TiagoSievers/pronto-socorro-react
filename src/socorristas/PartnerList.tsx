import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Typography, Box } from '@mui/material';
import { buscarSocorristas, updateSocorrista, deleteSocorrista, SocorristaParams } from './api';
import AddPartnerDialog from './AddPartnerDialog';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { supabase } from '../Supabase/supabaseRealtimeClient';

// Interface alinhada com a tabela socorrista
interface Socorrista {
  id: number;
  user_id: string;
  nome: string;
  telefone: string;
  email?: string;
  nome_empresa: string;
  status: string;
  data_cadastro: string;
}

const PartnerList: React.FC = () => {
  const [socorristas, setSocorristas] = useState<SocorristaParams[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSocorrista, setEditSocorrista] = useState<SocorristaParams | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [socorristaToDelete, setSocorristaToDelete] = useState<SocorristaParams | null>(null);

  // =============================
  // ÍNDICE DO ARQUIVO
  // 16: PartnerList (componente principal)
  // 26: useEffect - Carregamento de socorristas
  // 50: handleEdit
  // 55: handleDialogClose
  // 76: handleSaveEdit
  // 101: handleCreateSocorrista
  // 132: handleOpenDeleteDialog
  // 138: handleCloseDeleteDialog
  // 143: handleConfirmDelete
  // =============================

  // Função para buscar socorristas
  const loadSocorristas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await buscarSocorristas();
      data.sort((a: SocorristaParams, b: SocorristaParams) => {
        if (a.criado_em && b.criado_em) {
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        }
        return (b.id || 0) - (a.id || 0);
      });
      setSocorristas(data);
    } catch (error) {
      console.error('Erro ao carregar socorristas:', error);
      setError('Não foi possível carregar a lista de socorristas. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSocorristas();
    // Realtime subscription
    const channel = supabase
      .channel('public:socorrista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'socorrista' },
        (payload) => {
          loadSocorristas();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (socorrista: SocorristaParams) => {
    setEditSocorrista(socorrista);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditSocorrista(null);
  };

  const handleSaveEdit = async (data: { empresa: string; contato: string; email: string; telefone: string }) => {
    if (!editSocorrista) return;
    try {
      await updateSocorrista(editSocorrista.id!, {
        nome_empresa: data.empresa,
        nome: data.contato,
        email: data.email,
        telefone: data.telefone,
        status: editSocorrista.status
      });
      const updated = await buscarSocorristas();
      updated.sort((a: SocorristaParams, b: SocorristaParams) => {
        if (a.criado_em && b.criado_em) {
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        }
        return (b.id || 0) - (a.id || 0);
      });
      setSocorristas(updated);
      setDialogOpen(false);
      setEditSocorrista(null);
      alert('Socorrista atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar socorrista.');
    }
  };

  const handleOpenDeleteDialog = (socorrista: SocorristaParams) => {
    setSocorristaToDelete(socorrista);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSocorristaToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!socorristaToDelete) return;
    try {
      await deleteSocorrista(socorristaToDelete.id!);
      const updated = await buscarSocorristas();
      updated.sort((a: SocorristaParams, b: SocorristaParams) => {
        if (a.criado_em && b.criado_em) {
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        }
        return (b.id || 0) - (a.id || 0);
      });
      setSocorristas(updated);
      setDeleteDialogOpen(false);
      setSocorristaToDelete(null);
      alert('Socorrista excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir socorrista.');
    }
  };

  // 5. Renderização da tabela e diálogos
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
      <Table sx={{ minWidth: 650 }} aria-label="tabela de socorristas">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Empresa</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {socorristas.length > 0 ? (
            socorristas.map((socorrista) => (
              <TableRow key={socorrista.id}>
                <TableCell>{socorrista.id}</TableCell>
                <TableCell>{socorrista.nome}</TableCell>
                <TableCell>{socorrista.email}</TableCell>
                <TableCell>{socorrista.telefone}</TableCell>
                <TableCell>{socorrista.status}</TableCell>
                <TableCell>{socorrista.nome_empresa}</TableCell>
                <TableCell>
                  <Button size="small" color="primary" onClick={() => handleEdit(socorrista)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => handleOpenDeleteDialog(socorrista)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} align="center">
                Nenhum socorrista encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AddPartnerDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        initialData={editSocorrista ? {
          empresa: editSocorrista.nome_empresa || '',
          contato: editSocorrista.nome || '',
          email: editSocorrista.email || '',
          telefone: editSocorrista.telefone || '',
        } : undefined}
        onSave={editSocorrista ? handleSaveEdit : undefined}
      />
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        itemName={socorristaToDelete?.nome}
      />
    </TableContainer>
  );
};

export default PartnerList; 
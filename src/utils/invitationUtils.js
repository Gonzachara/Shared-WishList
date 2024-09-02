export const generateInvitationLink = (listId) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${listId}`;
};

export const shareLink = (link) => {
    if (navigator.share) {
        navigator.share({
            title: 'Únete a mi lista compartida',
            text: 'Haz clic en este enlace para unirte:',
            url: link,
        })
        .catch((error) => console.log('Error sharing', error));
    } else {
        // Fallback para navegadores que no soportan la API Web Share
        window.open(`https://wa.me/?text=${encodeURIComponent(`Haz clic en este enlace para unirte a mi lista compartida: ${link}`)}`, '_blank');
    }
};